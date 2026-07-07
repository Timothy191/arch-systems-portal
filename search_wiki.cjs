const https = require('https');
const url = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=loop%20filetype:webm&utf8=&format=json&srlimit=15';

const options = {
  headers: {
    'User-Agent': 'Bot-Script/1.0 (test@example.com)'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    json.query.search.forEach(item => {
      console.log(item.title);
    });
  });
});
