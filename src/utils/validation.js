const isValidWebsiteName = (name) => {
    // Alphanumeric, hyphens, underscores. 3-63 characters.
    // No dots to prevent extension spoofing or confusion.
    return /^[a-zA-Z0-9_-]{3,63}$/.test(name);
};

const isValidDomain = (domain) => {
    // Simple domain regex
    // Allows localhost, subdomains, etc.
    return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$|^localhost$/.test(domain);
};

const isValidGitBranch = (branch) => {
    // Allow alphanumerics, -, _, /, .
    // Disallow dangerous chars like ;, &, |, >, <, `, $, (, ), space
    // Also block path traversal ..
    if (branch.includes('..')) return false;
    return /^[a-zA-Z0-9\/\._-]+$/.test(branch);
};

const isValidRepoUrl = (url) => {
    // Allow https, http, git, ssh
    // Simple check to ensure it doesn't contain command injection chars
    if (/[;&|><`$]/.test(url)) return false;
    return /^(https?|git|ssh):\/\/[^\s]+$/.test(url) || /^[a-zA-Z0-9_\-.]+@[a-zA-Z0-9_\-.]+:.*$/.test(url);
};

module.exports = {
    isValidWebsiteName,
    isValidDomain,
    isValidGitBranch,
    isValidRepoUrl
};
