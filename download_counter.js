//generic counter for qeueing the # of concurent downloads
var DownloadCounter = function() {

  //counter
  var privateCounter = 1;

  //increment or decrment counter
  function changeBy(val) {
    privateCounter += val;
  }

  //methods to do something to counter
  return {
    //increment the counter by 1
    increment: function() {
      changeBy(1);
    },
    //decrement the counter by 1
    decrement: function() {
      changeBy(-1);
    },
    //return the current value of the counter
    value: function() {
      return privateCounter;
    }
  };
};

module.exports = DownloadCounter;
