'use strict';

const got = require('got');

const searchCache = new Map();

const wikiLanguage = 'en';

const apiUrl = `https://${wikiLanguage}.wikipedia.org/w/api.php`;

const defaultSearchParams = {
  action: 'query',
  generator: 'search',
  prop: 'info|description|extracts',
  exlimit: 10,
  exintro: true,
  inprop: 'url',
  format: 'json',
  origin: '*'
};

const searchParamKey = 'gsrsearch';

const toQueryString = params => '?' + 
  Object.keys(params)
    .map(key => `${key}=${encodeURI(params[key])}`)
    .join('&');

const getSearchQueryString = searchTerm => 
  toQueryString({ ...defaultSearchParams, [searchParamKey]: encodeURI(searchTerm) });

const getSearchUrl = searchTerm => `${apiUrl}${getSearchQueryString(searchTerm)}`;

async function fetchResults(searchTerm) {
  try {
    // Trim search term and make sure it isn't blank
    searchTerm = searchTerm.trim().toLowerCase();
    if(!searchTerm.length) return [];
    // Check cache for existing results
    if(searchCache.has(searchTerm)) return searchCache.get(searchTerm);
    // Retrieve data as json and add to cache
    const response = await got(getSearchUrl(searchTerm));
    const data = Object.values(JSON.parse(response.body).query.pages)
      .sort((a, b) => a.index - b.index);
    searchCache.set(searchTerm, data);
    return data;
  }
  catch(err) {
    return err;
  }
}

module.exports = (pluginContext) => {
  function startup() {
    // you can do some preparations here
  }
 
  async function search(query, res) {

    const results = await fetchResults(query.trim());
    res.add(
      Array.isArray(results)
      ? results.map(({ pageid: id, title, description: desc, extract: html, canonicalurl: url }) => ({ 
          id, title, desc,
          preview: html != null,
          payload: { url, html }
        }))
      : []
    );
  }

  function execute(id, payload) {
    pluginContext.shell.openExternal(payload.url);
  }
  
  function renderPreview(id, payload, render) {
    render(
      `<html>
        <body style="color:#fff; overflow: hidden;">
          <script>
            let scrollPos = 0, scrollMax, interval;
            const scrollSpeed = 0.25,
                  timeToStart = 7000,
                  timeToReset = 15000;

            function queueScroll() {
              if(document.body.scrollHeight > window.innerHeight) {
                scrollMax = document.body.scrollHeight - window.innerHeight;
                setTimeout(startScroll, timeToStart);
              }
            }

            function startScroll() {
              interval = setInterval(doScroll, 1000/30);
            }

            function doScroll() {
              scrollPos += scrollSpeed;
              window.scrollTo(0, Math.round(scrollPos));
              if(scrollPos >= scrollMax) {
                clearInterval(interval);
                setTimeout(resetScroll, timeToReset);
              }
            }

            function resetScroll() {
              window.scrollTo(0, 0);
              scrollPos = 0;
              queueScroll();
            }

            window.addEventListener('load', queueScroll);
          </script>
          ${payload.html}
        </body>
      </html>`
    );
  }

  return { startup, search, execute, renderPreview };
};
