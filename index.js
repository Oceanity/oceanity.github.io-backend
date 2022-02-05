// Imports
require("dotenv").config();
const fs = require('fs'),
  axios = require("axios"),
  express = require('express'),
  cors = require('cors'),
  scope = [
    'channel:read:subscriptions',
    'channel_subscriptions'
  ]

const app = express(),
  port = 8080;
app.use(cors());

app.get("/subs", (req, res) => {
  // If required Env Variables not set, close
  if (!process.env.USER_ID || !process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_SECRET) {
    console.log("Please ensure USER_ID, TWITCH_CLIENT_ID and TWITCH_SECRET are set in .env!!");
  } else {
    // Set local data
    // Check if file exists and if file is less than 5 minutes old
    fs.stat('subs.json', (err, stat) => {
      if (err || ((new Date().getTime() - stat.mtime) / 1000) > (15 * 60)) {
        //authorizeToken(process.env.ACCESS_TOKEN);
        console.log("creating new file");
        refreshToken(process.env.ACCESS_TOKEN, (token) => {
          getSubs(token, subs => {
            res.send(subs);
          });
        });
        //getSubs(process.env.ACCESS_TOKEN);
      } else {
        console.log("reading existing file");
        fs.readFile('subs.json', (err, data) => {
          if (err) throw err
          let subs = JSON.parse(data);
          res.send(subs);
        });
      }
    });
  }

});

app.listen(port, function () {
  console.log('Node.js listening on port ' + port)
})


function refreshToken(token, callback) {
  const url = `https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${process.env.REFRESH_TOKEN}&client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_SECRET}`
  axios.post(url)
    .then(res => {
      if (res.status === 200 && callback && typeof callback === 'function') {
        callback(res.data.access_token);
      }
    });
}

function getSubs(token, callback, subs = [], cursor, page = 0) {
  const url = `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${process.env.USER_ID}&first=100${cursor ? `&after=${cursor}` : ''}`,
    headers = {
      "Authorization": `Bearer ${token}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID
    }

  try {
    axios.get(url, {
        headers
      })
      .then(res => {
        subs = [...subs, ...res.data.data];
        page++;
        if (page * 25 < res.data.total) {
          getSubs(token, callback, subs, res.data.pagination.cursor, page);
        } else {
          fs.writeFile("subs.json", JSON.stringify({
            subs
          }), (err) => {
            if (err) throw err;
            if (callback && typeof callback === "function") {
              callback(subs);
            }
          });
        }
      })
  } catch {

  }
}
