const madge = require('madge');

madge('./lib/firebase.js').then((res) => {
  console.log(res.circular());
});
