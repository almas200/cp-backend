const http = require('http');

http.get('http://localhost:5000/api/courses', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('API Success:', json.success);
            console.log('Courses Count:', json.courses ? json.courses.length : 'N/A');
            if (json.courses && json.courses.length > 0) {
                console.log('First titles:', json.courses.slice(0, 5).map(c => c.title));
            }
            process.exit(0);
        } catch (e) {
            console.error('Parse Error:', e.message);
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error('API Error:', err.message);
    process.exit(1);
});
