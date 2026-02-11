const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Wrapper for crontab
const list = async () => {
    try {
        // List for www-data
        const { stdout } = await execAsync('crontab -u www-data -l');
        return parseCrontab(stdout);
    } catch (error) {
        // If empty, it returns exit code 1
        return [];
    }
};

const save = async (jobs) => {
    const cronString = jobs.map(job => 
        `${job.schedule} ${job.command} # ${job.comment || ''}`
    ).join('\n') + '\n';
    
    // Write via pipe
    // Need to escape newlines potentially? execAsync handles string arguments generally well if quoted but pipe is harder.
    // Easier: echo string | crontab -u www-data -
    
    // Safety: ensure no newlines in command/schedule to prevent injection of multiple lines
    // But crontab format is line-based.
    
    const safeCronString = cronString.replace(/'/g, "'\\''");
    await execAsync(`echo '${safeCronString}' | crontab -u www-data -`);
    return true;
};

const add = async (schedule, command, comment) => {
    const jobs = await list();
    jobs.push({ schedule, command, comment });
    await save(jobs);
    return true;
};

const remove = async (index) => {
    const jobs = await list();
    if (index >= 0 && index < jobs.length) {
        jobs.splice(index, 1);
        await save(jobs);
        return true;
    }
    return false;
};

const parseCrontab = (stdout) => {
    const lines = stdout.split('\n');
    const jobs = [];
    lines.forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return; // Ignore comments/empty
        
        // Split by space, first 5 are schedule
        const parts = line.split(/\s+/);
        if (parts.length < 6) return;
        
        const schedule = parts.slice(0, 5).join(' ');
        let command = parts.slice(5).join(' ');
        let comment = '';
        
        // Extract trail comment if any
        if (command.includes('#')) {
            const commentParts = command.split('#');
            command = commentParts[0].trim();
            comment = commentParts.slice(1).join('#').trim();
        }
        
        jobs.push({ schedule, command, comment });
    });
    return jobs;
};

module.exports = {
    list,
    add,
    remove
};
