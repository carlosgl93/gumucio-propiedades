/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-86c9b217'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "assets/Alert-Du-hPTne.js",
    "revision": null
  }, {
    "url": "assets/App-QaLxMQNi.js",
    "revision": null
  }, {
    "url": "assets/Container-sn6iCut0.js",
    "revision": null
  }, {
    "url": "assets/firebase--YBw2ZOA.js",
    "revision": null
  }, {
    "url": "assets/Grow-C5u8h8k2.js",
    "revision": null
  }, {
    "url": "assets/index-0_EBpI5N.js",
    "revision": null
  }, {
    "url": "assets/index-Byu6mzIt.js",
    "revision": null
  }, {
    "url": "assets/index-C0qMVvvW.js",
    "revision": null
  }, {
    "url": "assets/index-CEryDoTP.js",
    "revision": null
  }, {
    "url": "assets/index-ChotpQWs.js",
    "revision": null
  }, {
    "url": "assets/index-CMbA2nMG.js",
    "revision": null
  }, {
    "url": "assets/index-DIo9FI-o.js",
    "revision": null
  }, {
    "url": "assets/index-s-dL8_qA.css",
    "revision": null
  }, {
    "url": "assets/MenuItem-C5ACSPkV.js",
    "revision": null
  }, {
    "url": "assets/property-Lu_EZm_S.js",
    "revision": null
  }, {
    "url": "assets/react-CLmNMr_U.js",
    "revision": null
  }, {
    "url": "assets/root-BID5mGmQ.js",
    "revision": null
  }, {
    "url": "assets/TextField-DZspQP0X.js",
    "revision": null
  }, {
    "url": "assets/useAuth-8ZLho2bg.js",
    "revision": null
  }, {
    "url": "index.html",
    "revision": "5f432a6d54005944d8362e9ce420e761"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "410d328b07c46ddbe9a2e7cb29aa70da"
  }, {
    "url": "assets/404-TCzqS-Pn.gif",
    "revision": null
  }, {
    "url": "audit.png",
    "revision": "4e06993eed49427f321924f5441942bf"
  }, {
    "url": "bundle.png",
    "revision": "2c99d93d65eefd283b5e40fe873fe5e5"
  }, {
    "url": "cover.png",
    "revision": "1df4043c45d5bb3e7cfaa413f24ec0f2"
  }, {
    "url": "demo-dark.png",
    "revision": "02bd120430604874b8daa043b5305edf"
  }, {
    "url": "demo-light.png",
    "revision": "2d500252e78cdb3d463788942aab219b"
  }, {
    "url": "favicon.svg",
    "revision": "1d63cc3476f55e13ee57fff67a6fd741"
  }, {
    "url": "file-folder-structure.png",
    "revision": "5fda436d4ffc2d43cf22af19e5fe9186"
  }, {
    "url": "modern-house-bg.png",
    "revision": "4f5c40ac5cf065e7c1f5a1da3a2215e8"
  }, {
    "url": "property-1.jpg",
    "revision": "2d500252e78cdb3d463788942aab219b"
  }, {
    "url": "property-2.jpg",
    "revision": "02bd120430604874b8daa043b5305edf"
  }, {
    "url": "property-3.jpg",
    "revision": "2c99d93d65eefd283b5e40fe873fe5e5"
  }, {
    "url": "pwa-192x192.png",
    "revision": "3b6265c5e75ae1c1fd666d575f33884b"
  }, {
    "url": "pwa-512x512.png",
    "revision": "e571b86ade2a8bda44002d5903cae102"
  }, {
    "url": "pwa-reload.png",
    "revision": "0b6b77eb7dbc9ee80eb9e7054731e0d6"
  }, {
    "url": "use-template.png",
    "revision": "40db31e4701f1dd284b71a4a9469d757"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "410d328b07c46ddbe9a2e7cb29aa70da"
  }, {
    "url": "favicon.ico",
    "revision": "eb5b87164c9be3cb704a1ac547f2c51d"
  }, {
    "url": "favicon.svg",
    "revision": "1d63cc3476f55e13ee57fff67a6fd741"
  }, {
    "url": "pwa-192x192.png",
    "revision": "3b6265c5e75ae1c1fd666d575f33884b"
  }, {
    "url": "pwa-512x512.png",
    "revision": "e571b86ade2a8bda44002d5903cae102"
  }, {
    "url": "robots.txt",
    "revision": "5e0bd1c281a62a380d7a948085bfe2d1"
  }, {
    "url": "manifest.webmanifest",
    "revision": "f7019b947762d4b814dcea50ab5e2478"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
