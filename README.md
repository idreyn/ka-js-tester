# ka-js-tester

To build, you'll need `npm` and `browserify`

    cd ka-js-tester
    npm install # Get deps
    browserify src/main.js -t babelify -t browserify-css -o bundle.js # Build bundle
    python -m SimpleHTTPServer # Serve!

See [the writeup](https://docs.google.com/document/d/1A3YvNwqnp1_rYAA_sqrPs6wq6caPdY-rBNtdV6qT8dI/edit?usp=sharing) for more information.

