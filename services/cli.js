module.exports = {
  handle: (name) => {
    return callFunc(name);
  }
}

function callFunc(name) {
  let fn = funcObj[name];

  if(typeof fn !== 'function') {
    return 'Invalid command, enter !help to view some available commands';
  }
  return fn();
}

let funcObj = {};

funcObj.help = () => {
  return 'Available commands: ';
}


