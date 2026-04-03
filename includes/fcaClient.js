"use strict";

const { login } = require("@neoaz07/nkxfca");

function loginAsync(credentials, options = {}) {
  return new Promise((resolve, reject) => {
    login(credentials, options, (err, api) => {
      if (err) return reject(err);
      resolve(api);
    });
  });
}

module.exports = {
  login,
  loginAsync
};
