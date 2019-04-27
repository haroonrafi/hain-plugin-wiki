'use strict';

module.exports = (pluginContext) => {
  function startup() {
    // you can do some preparations here
  }
 
  function search(query, res) {
    // you can send your results here
  }

  function execute(id, payload) {
    // you can run something when user selected your result
  }
  
  function renderPreview(id, payload, render) {
    // you can render preview with HTML
  }

  return { startup, search, execute, renderPreview };
};
