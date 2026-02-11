const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Common extensions to manage
const EXTENSIONS = [
    'bcmath', 'bz2', 'curl', 'gd', 'imagick', 'intl', 'mbstring', 
    'mysql', 'readline', 'sqlite3', 'xml', 'zip', 'soap', 'imap', 'gmp'
];

const getPhpVersion = async () => {
    try {
        const { stdout } = await execAsync('php -r "echo PHP_MAJOR_VERSION.\'.\'.PHP_MINOR_VERSION;"');
        return stdout.trim();
    } catch {
        return '8.2'; // Default fallback
    }
};

const listExtensions = async () => {
    const version = await getPhpVersion();
    const results = [];

    // Get installed extensions via dpkg or php -m?
    // php -m lists active ones.
    // dpkg -l lists installed packages.
    
    // Let's check installed packages first
    const { stdout: installedPkgs } = await execAsync(`dpkg -l | grep php${version}-`);
    const { stdout: activeExts } = await execAsync('php -m');

    for (const ext of EXTENSIONS) {
        const pkgName = `php${version}-${ext}`;
        const isInstalled = installedPkgs.includes(pkgName);
        const isActive = activeExts.toLowerCase().includes(ext); // rudimentary check

        results.push({
            name: ext,
            package: pkgName,
            installed: isInstalled,
            active: isActive
        });
    }

    return { version, extensions: results };
};

const installExtension = async (extension) => {
    if (!EXTENSIONS.includes(extension)) throw new Error('Invalid extension');
    const version = await getPhpVersion();
    const pkgName = `php${version}-${extension}`;

    // Update apt cache quietly? No, too slow. Assume updated.
    try {
        await execAsync(`DEBIAN_FRONTEND=noninteractive apt-get install -y ${pkgName}`);
        // Restart PHP-FPM
        await execAsync(`systemctl restart php${version}-fpm`);
        return true;
    } catch (error) {
        throw new Error(`Failed to install ${pkgName}: ${error.message}`);
    }
};

const uninstallExtension = async (extension) => {
    if (!EXTENSIONS.includes(extension)) throw new Error('Invalid extension');
    const version = await getPhpVersion();
    const pkgName = `php${version}-${extension}`;

    try {
        await execAsync(`DEBIAN_FRONTEND=noninteractive apt-get remove -y ${pkgName}`);
        await execAsync(`systemctl restart php${version}-fpm`);
        return true;
    } catch (error) {
        throw new Error(`Failed to remove ${pkgName}: ${error.message}`);
    }
};

module.exports = {
    listExtensions,
    installExtension,
    uninstallExtension
};
