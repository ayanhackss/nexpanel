const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');

const DB_CONFIG = {
    user: process.env.DB_USER || 'panel_admin',
    password: process.env.DB_PASSWORD || 'change_this_password',
    host: '127.0.0.1',
    dbname: process.env.DB_NAME || 'hosting_panel'
};

const setup = async () => {
    try {
        console.log('Configuring Postfix and Dovecot...');

        // 1. Create System User for vmail
        try {
            await execAsync('id -u vmail');
        } catch {
            await execAsync('groupadd -g 5000 vmail');
            await execAsync('useradd -g vmail -u 5000 vmail -d /var/vmail -m');
        }

        // 2. Configure Postfix
        // main.cf
        const postconf = [
            'postconf -e "myhostname = $(hostname)"',
            'postconf -e "virtual_uid_maps = static:5000"',
            'postconf -e "virtual_gid_maps = static:5000"',
            'postconf -e "virtual_mailbox_base = /var/vmail"',
            'postconf -e "virtual_mailbox_domains = mysql:/etc/postfix/mysql-virtual-mailbox-domains.cf"',
            'postconf -e "virtual_mailbox_maps = mysql:/etc/postfix/mysql-virtual-mailbox-maps.cf"',
            'postconf -e "virtual_alias_maps = mysql:/etc/postfix/mysql-virtual-alias-maps.cf"',
            'postconf -e "smtpd_sasl_type = dovecot"',
            'postconf -e "smtpd_sasl_path = private/auth"',
            'postconf -e "smtpd_sasl_auth_enable = yes"',
            // Basic security
            'postconf -e "smtpd_recipient_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination"'
        ];

        for (const cmd of postconf) {
            await execAsync(cmd);
        }

        // MySQL Maps
        const mapConfig = `user = ${DB_CONFIG.user}
password = ${DB_CONFIG.password}
hosts = ${DB_CONFIG.host}
dbname = ${DB_CONFIG.dbname}
`;

        await fs.writeFile('/etc/postfix/mysql-virtual-mailbox-domains.cf', 
            `${mapConfig}query = SELECT 1 FROM domains WHERE domain='%s'`);
            
        await fs.writeFile('/etc/postfix/mysql-virtual-mailbox-maps.cf', 
            `${mapConfig}query = SELECT 1 FROM email_accounts WHERE email='%s'`);
            
        await fs.writeFile('/etc/postfix/mysql-virtual-alias-maps.cf', 
            `${mapConfig}query = SELECT destination FROM email_aliases WHERE source='%s'`);

        // 3. Configure Dovecot
        // dovecot-sql.conf.ext
        const dovecotSql = `driver = mysql
connect = host=${DB_CONFIG.host} dbname=${DB_CONFIG.dbname} user=${DB_CONFIG.user} password=${DB_CONFIG.password}
default_pass_scheme = SHA512-CRYPT
password_query = SELECT email as user, password_hash as password FROM email_accounts WHERE email='%u';
user_query = SELECT '/var/vmail/%d/%n' as home, 5000 as uid, 5000 as gid FROM email_accounts WHERE email='%u';
`;
        await fs.writeFile('/etc/dovecot/dovecot-sql.conf.ext', dovecotSql);

        // Enable SQL auth in Dovecot
        // This is tricky as default config is split.
        // Quick hack: append to local.conf if supported or overwrite 10-auth.conf logic?
        // Safest: Write a new local.conf that includes sql
        // But dovecot config structure varies by OS.
        // Taking a simpler route: We create a minimal reliable set of configs or assume default structure.
        
        // Let's assume standard Ubuntu/Debian dovecot
        // Check if /etc/dovecot/conf.d/10-auth.conf exists
        
        // Only do this if not already configured to avoid overwriting user custom logic if re-run?
        // We will just enable auth-sql.conf.ext
        // sed -i 's/#!include auth-sql.conf.ext/!include auth-sql.conf.ext/' /etc/dovecot/conf.d/10-auth.conf
        
        await execAsync(`sed -i 's/^#!include auth-sql.conf.ext/!include auth-sql.conf.ext/' /etc/dovecot/conf.d/10-auth.conf`);
        await execAsync(`sed -i 's/^!include auth-system.conf.ext/#!include auth-system.conf.ext/' /etc/dovecot/conf.d/10-auth.conf`);

        // Update auth-sql.conf.ext to point to ours
        await fs.writeFile('/etc/dovecot/conf.d/auth-sql.conf.ext', `passdb {
  driver = sql
  args = /etc/dovecot/dovecot-sql.conf.ext
}
userdb {
  driver = sql
  args = /etc/dovecot/dovecot-sql.conf.ext
}
`);

        // Mail location
        // sed -i 's|^mail_location =.*|mail_location = maildir:/var/vmail/%d/%n|' /etc/dovecot/conf.d/10-mail.conf
        // better to append
        await fs.writeFile('/etc/dovecot/local.conf', `
mail_location = maildir:/var/vmail/%d/%n
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0666
    user = postfix
    group = postfix
  }
}
ssl = no
disable_plaintext_auth = no
`);

        // 4. Restart Services
        await execAsync('systemctl restart postfix dovecot');
        console.log('Email configuration complete.');

        return true;
    } catch (error) {
        console.error('Email setup failed:', error);
        throw error;
    }
};

module.exports = { setup };
