const https = require('https');
const url = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=background%20loop%20filetype:webm&utf8=&format=json&srlimit=10';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    json.query.search.forEach(item => {
      console.log(item.title);
    });
  });
});
