const assert = require('assert');
const { isValidWebsiteName, isValidDomain, isValidGitBranch, isValidRepoUrl } = require('./validation');

try {
    // Website Name
    assert.strictEqual(isValidWebsiteName('my-site'), true, 'my-site should be valid');
    assert.strictEqual(isValidWebsiteName('site_123'), true, 'site_123 should be valid');
    assert.strictEqual(isValidWebsiteName('abc'), true, 'abc should be valid');
    assert.strictEqual(isValidWebsiteName('ab'), false, 'ab should be invalid (too short)');
    assert.strictEqual(isValidWebsiteName('my.site'), false, 'my.site should be invalid (dot)');
    assert.strictEqual(isValidWebsiteName('my site'), false, 'my site should be invalid (space)');
    assert.strictEqual(isValidWebsiteName(';rm -rf'), false, 'shell injection should be invalid');

    // Domain
    assert.strictEqual(isValidDomain('example.com'), true, 'example.com should be valid');
    assert.strictEqual(isValidDomain('sub.example.com'), true, 'sub.example.com should be valid');
    assert.strictEqual(isValidDomain('localhost'), true, 'localhost should be valid');
    assert.strictEqual(isValidDomain('example'), false, 'example should be invalid');
    assert.strictEqual(isValidDomain(';ls'), false, 'shell injection should be invalid');

    // Git Branch
    assert.strictEqual(isValidGitBranch('main'), true, 'main should be valid');
    assert.strictEqual(isValidGitBranch('feature/foo'), true, 'feature/foo should be valid');
    assert.strictEqual(isValidGitBranch('v1.0'), true, 'v1.0 should be valid');
    assert.strictEqual(isValidGitBranch('../foo'), false, '../foo should be invalid');
    assert.strictEqual(isValidGitBranch('foo;bar'), false, 'foo;bar should be invalid');

    // Repo URL
    assert.strictEqual(isValidRepoUrl('https://github.com/user/repo.git'), true, 'https repo should be valid');
    assert.strictEqual(isValidRepoUrl('git@github.com:user/repo.git'), true, 'ssh repo should be valid');
    assert.strictEqual(isValidRepoUrl('ssh://user@host.com/repo.git'), true, 'ssh:// repo should be valid');
    assert.strictEqual(isValidRepoUrl('https://example.com/repo;rm -rf'), false, 'injected url should be invalid');

    console.log('All validation tests passed!');
} catch (e) {
    console.error('Test failed:', e.message);
    process.exit(1);
}
