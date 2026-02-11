const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;

const generateCert = async (domain, email) => {
    try {
        // Validation
        if (!domain || !/^[a-zA-Z0-9.-]+$/.test(domain)) {
            throw new Error('Invalid domain name');
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Invalid email address');
        }

        // Run Certbot
        // --nginx: Use Nginx plugin
        // --non-interactive: Don't ask for input
        // --agree-tos: Agree to terms
        // --email: Required for renewal info
        // -d: Domain
        const cmd = `certbot --nginx --non-interactive --agree-tos --email ${email} -d ${domain}`;
        
        await execAsync(cmd);

        // Inject HSTS Header
        try {
            const nginxConfig = `/etc/nginx/sites-available/${domain}`;
            // Use sed to insert HSTS header after 'listen 443 ssl' or inside the server block
            // We search for 'ssl_certificate' which Certbot adds, and insert after it
            await execAsync(`sed -i '/ssl_certificate_key/a \\    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;' ${nginxConfig}`);
            await execAsync('systemctl reload nginx');
        } catch (e) {
            console.error('Failed to add HSTS header:', e);
            // Don't fail the whole request, as SSL is working
        }

        return true;
    } catch (error) {
        throw new Error(`SSL generation failed: ${error.message}`);
    }
};

const renewCerts = async () => {
    try {
        await execAsync('certbot renew');
        return true;
    } catch (error) {
        throw new Error(`SSL renewal failed: ${error.message}`);
    }
};

const listCerts = async () => {
    try {
        const { stdout } = await execAsync('certbot certificates');
        
        // Parse output
        const certs = [];
        const lines = stdout.split('\n');
        let currentCert = null;

        lines.forEach(line => {
            if (line.includes('Certificate Name:')) {
                if (currentCert) certs.push(currentCert);
                currentCert = { name: line.split(':')[1].trim() };
            } else if (line.includes('Domains:') && currentCert) {
                currentCert.domains = line.split(':')[1].trim().split(' ');
            } else if (line.includes('Expiry Date:') && currentCert) {
                currentCert.expiry = line.split('Expiry Date:')[1].split('(')[0].trim();
            } else if (line.includes('Certificate Path:') && currentCert) {
                currentCert.path = line.split(':')[1].trim();
            }
        });
        if (currentCert) certs.push(currentCert);

        return certs;
    } catch (error) {
        // If no certs, it might error or return "No certificates found"
        return [];
    }
};

const revokeCert = async (certName) => {
    try {
        await execAsync(`certbot delete --cert-name ${certName} --non-interactive`);
        return true;
    } catch (error) {
        throw new Error(`Failed to revoke certificate: ${error.message}`);
    }
}

module.exports = {
    generateCert,
    renewCerts,
    listCerts,
    revokeCert
};
