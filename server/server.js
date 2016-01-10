/* eslint-disable no-console, no-use-before-define */

import path from 'path'
import Express from 'express'
import qs from 'qs'

import webpack from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'
import webpackHotMiddleware from 'webpack-hot-middleware'
import webpackConfig from '../webpack.config'

import React from 'react';
import redux from 'redux';
import { Link } from 'react-router';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { match, RoutingContext } from 'react-router';

import configureStore from '../common/configureStore'
import App from '../client/app/App';
import { fetchCounter } from '../common/counter/api';
import createRoutes from '../client/createRoutes';

const app = new Express();
const port = 3000;

// Use this middleware to set up hot module reloading via webpack.
const compiler = webpack(webpackConfig);
app.use(webpackDevMiddleware(compiler, {noInfo: true, publicPath: webpackConfig.output.publicPath}));
app.use(webpackHotMiddleware(compiler));

app.use(handleRender);

const routes = createRoutes();

function handleRender(req, res) {
  return match({routes, location: req.url}, async(error, redirectLocation, renderProps) => {
    if (error) {
      res.status(500).send(error.message)
    } else if (redirectLocation) {
      res.redirect(302, redirectLocation.pathname + redirectLocation.search)
    } else if (renderProps) {
      // You can also check renderProps.components or renderProps.routes for
      // your "not found" component or route respectively, and send a 404 as
      // below, if you're using a catch-all route.

      //const apiResult = await fetchCounter();

      // Compile an initial state
      const initialState = {};

      // TODO - here I somehow need to call each component's static fetchData method and return a page afterwards
      const {routes} = renderProps;
      routes
        .filter(({component}) => component.fetchData)
        .map(component => console.log(component))
        .map(component => {
          // have each component dispatch load actions that return promises
          return component.fetchData(redux.dispatch);
        })
        .then(() => {
          // Create a new Redux store instance
          const store = configureStore(initialState);
          const html = renderToString(
            <Provider store={store}>
              <RoutingContext {...renderProps}/>
            </Provider>
          );

          // Grab the initial state from our Redux store
          const finalState = store.getState();

          // Send the rendered page back to the client
          res.send(renderFullPage(html, finalState));
        });


    } else {
      res.status(404).send('Not found.')
    }
  });
}

function renderFullPage(html, initialState) {
  return `
    <!doctype html>
    <html>
      <head>
        <title>Redux Universal Example</title>
      </head>
      <body>
        <div id="app">${html}</div>
        <script>
          window.__INITIAL_STATE__ = ${JSON.stringify(initialState)}
        </script>
        <script src="/static/bundle.js"></script>
      </body>
    </html>
    `
}

app.listen(port, (error) => {
  if (error) {
    console.error(error)
  } else {
    console.info(`Listening on port ${port}. Open up http://localhost:${port}/ in your browser.`)
  }
});
