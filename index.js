'use strict';

const got = require('got');
const searchCache = require('./search-cache');

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
    searchCache.create();
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
        <head>
          <link href="https://fonts.googleapis.com/css?family=Roboto:400,400i,700,700i" rel="stylesheet">
          <style>
            body {
              font-family: 'Roboto', Helvetica, Arial, sans-serif;
              line-height: 1.5;
              background: transparent;
              overflow: hidden;
            }
            
            .result-content--container {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              
              -webkit-mask-image: -webkit-gradient(
                linear, left top, left bottom, 
                color-stop(0.00,  rgba(0,0,0,1)),
                color-stop(0.60,  rgba(0,0,0,1)),
                color-stop(0.95,  rgba(0,0,0,0)),
                color-stop(1.00,  rgba(0,0,0,0)),
                from(rgba(0,0,0,1)), to(rgba(0,0,0,0))
              );
            }

            .read-more--container {
              position: fixed;
              width: 100%;
              padding: 8em 1em 1em;
              bottom: 0;
              left: 0;
              text-align: center;
              font-weight: 400;
              font-size: 12px;
            }

            .read-more--text { opacity: 0.8; }

            .kbd {
              color: #888;
              background: #eee;
              border: 1px solid #adb3b9;
              border-radius: 2px;
              padding: .2em;
              box-shadow: 0 1px 0 rgba(10, 12, 14, 0.1), 0 0 0 1px white inset;
            }
          </style>
          <script>
            window.addEventListener('load', () => {
              if (parent) {
                const parentColorEl = 
                  [ ...parent.document.body.querySelectorAll('[style*="color"]') ]
                    .find(el => el.style.color && el.style.color.length);

                if(parentColorEl) document.body.style.color = parentColorEl.style.color;
              }
            });
          </script>
        </head>
        <body>

          <div class="result-content--container">
            ${payload.html}
          </div>

          <div class="read-more--container">
            <span class="read-more--text">
              Press <span class="kbd">enter</span> to view full article
            </span>
          </div>

        </body>
      </html>`
    );
  }

  return { startup, search, execute, renderPreview };
};
