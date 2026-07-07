const https = require('https');
https.get('https://api.github.com/search/code?q=extension:webm+size:%3E1000+background', {
  headers: {
    'User-Agent': 'NodeJS',
    'Accept': 'application/vnd.github.v3+json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.items) {
        result.items.slice(0, 10).forEach(i => console.log(i.html_url.replace('/blob/', '/raw/')));
      } else {
        console.log(result);
      }
    } catch(e) {
      console.log(e);
    }
  });
});
