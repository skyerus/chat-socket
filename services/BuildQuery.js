module.exports = {
  build(data) {
    if (typeof (data) === 'string') return data;
    var query = [];
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
      }
    }
    return `?${query.join('&')}`;
  }
}
