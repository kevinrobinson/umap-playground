/**
 * @fileoverview Demo that helps explain what t-SNE is doing.
 * In particular, shows how various geometries translate to a 2D map,
 * and lets you play with the perplexity hyperparameter.
 *
 * None of this is optimized code, because it doesn't seem necessary
 * for the small cases we're considering.
 */
 
// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


// Global variable for whether we should keep optimizing.
var playgroundThread = 0;
var GLOBALS = {
  playgroundDemo: null, // the object to control running the playground simulation
  trayDemo: null, // the object to control running the tray simulation
  running: true,
  unpausedBefore: false,
  stepLimit: 5000,
  state: {},
  showDemo: null,
  // perplexitySlider: null,
  // epsilonSlider: null,
  // seedSlider: null,
}

main();
// Main entry point.
function main() {
  // Set state from hash.
  var format = d3.format(",");

  function setStateFromParams() {
    var params = {};
    window.location.hash.substring(1).split('&').forEach(function(p) {
      var tokens = p.split('=');
      params[tokens[0]] = tokens[1];
    });
    function getParam(key, fallback) {
      return params[key] === undefined ? fallback : params[key];
    }
    GLOBALS.state = {
      perplexity: +getParam('perplexity', 10),
      epsilon: +getParam('epsilon', 5),
      
      nNeighbors: +getParam('nNeighbors', 15),
      spread: +getParam('spread', 10),
      minDist: +getParam('minDist', 10),

      seed: +getParam('seed', 42),
      demo: +getParam('demo', 0),
      demoParams: getParam('demoParams', '20,2').split(',').map(Number)
    };
  }
  setStateFromParams();

  // Utility function for creating value sliders.
  function makeSlider(container, name, min, max, start) {
    var dis = d3.select(container)
    dis.append("span").classed("slider-label-" + name, true)
      .text(name + ' ')
    var value = dis.append("span").classed("slider-value-" + name, true)
      .text(start)

    var slider = dis.append("input")
      .attr("type", "range")
      .attr("min", min)
      .attr("max", max)
      .attr("value", start)
      .on("change", updateParameters)
      .on("input", function() {
        value.text(slider.node().value);
      })
    return slider.node();
  }

  // Create menu of possible demos.
  var menuDiv = d3.select("#data-menu");

  var dataMenus = menuDiv.selectAll(".demo-data")
      .data(demos)
    .enter().append("div")
      .classed("demo-data", true)
      .on("click", function(d,i) {
        showDemo(i);
      });

  dataMenus.append("canvas")
    .attr("width", 150)
    .attr("height", 150)
    .each(function(d,i) {
      var demo = demos[i];
      var params = [demo.options[0].start]
      if(demo.options[1]) params.push(demo.options[1].start)
      var points = demo.generator.apply(null, params);
      var canvas = d3.select(this).node()
      visualize(points, canvas, null, null)
    });

  dataMenus.append("span")
    .text(function(d) { return d.name});

  // Set up t-SNE UI.
  var tsneUI = document.getElementById('tsne-options');
  // tsne
  // var perplexitySlider = makeSlider(tsneUI, 'Perplexity', 2, 100,
  //     GLOBALS.state.perplexity);
  // var epsilonSlider = makeSlider(tsneUI, 'Epsilon', 1, 20,
  //     GLOBALS.state.epsilon);

  // umap
  var nNeighborsSlider = makeSlider(tsneUI, 'Nearest neighbors', 5, 45,
      GLOBALS.state.nNeighbors);
  var minDistSlider = makeSlider(tsneUI, '1000 * Minimal distance', 1, 250,
      GLOBALS.state.minDist);
  var spreadSlider = makeSlider(tsneUI, '10 * Spread', -10, 100,
      GLOBALS.state.spread);
  // var seedSlider = makeSlider(tsneUI, 'Seed', 1, 1000,
  //     GLOBALS.state.seed);

  // GLOBALS.perplexitySlider = perplexitySlider
  // GLOBALS.epsilonSlider = epsilonSlider
  // GLOBALS.seedSlider = seedSlider;


  // Controls for data options.
  var optionControls;
  var demo;

  function updateParameters() {
    GLOBALS.state.demoParams = optionControls.map(function(s) {return s.value;});
    // GLOBALS.state.perplexity = perplexitySlider.value;
    // GLOBALS.state.epsilon = epsilonSlider.value;
    
    GLOBALS.state.nNeighbors = nNeighborsSlider.value;
    GLOBALS.state.minDist = minDistSlider.value;
    GLOBALS.state.spread = spreadSlider.value;
    // GLOBALS.state.seed = seedSlider.value;
    // console.log('GLOBALS.state', GLOBALS.state);

    d3.select("#share").style("display", "")
      .attr("href", "#" + generateHash())

    runState();
  }

  function generateHash() {
    function stringify(map) {
      var s = '';
      for (key in map) {
        s += '&' + key + '=' + map[key];
      }
      return s.substring(1);
    }
    //window.location.hash = stringify(GLOBALS.state);
    return stringify(GLOBALS.state);
  }

  function runState() {
    // Set up t-SNE and start it running.
    var points = demo.generator.apply(null, GLOBALS.state.demoParams);
    var canvas = document.getElementById('output');

    // if there was already a playground demo going, lets destroy it and make a new one
    if(GLOBALS.playgroundDemo) {
      GLOBALS.playgroundDemo.destroy();
      delete GLOBALS.playgroundDemo;
    }
    //runPlayground(points, canvas, GLOBALS.state, function(step) {
    GLOBALS.playgroundDemo = demoMaker(points, canvas, GLOBALS.state, function(step) {
      d3.select("#step").text(format(step));
      if(step >= GLOBALS.stepLimit && !GLOBALS.unpausedBefore) {
        setRunning(false)
      }
    })
    GLOBALS.unpausedBefore = false;
    setRunning(true);
  }

  var playPause = document.getElementById('play-pause');
  function setRunning(r) {
    GLOBALS.running = r;
    GLOBALS.playgroundRunning = r;
    if (GLOBALS.running) {
      GLOBALS.playgroundDemo.unpause();
      playPause.setAttribute("class", "playing")
    } else {
      GLOBALS.playgroundDemo.pause();
      playPause.setAttribute("class", "paused")
    }
  }

  // Hook up play / pause / restart buttons.
  playPause.onclick = function() {
    GLOBALS.unpausedBefore = true;
    setRunning(!GLOBALS.running);
  };

  document.getElementById('restart').onclick = updateParameters;

  // Show a given demo.
  GLOBALS.showDemo = showDemo;
  function showDemo(index, initializeFromState) {
    GLOBALS.state.demo = index;
    demo = demos[index];
    // Show description of demo data.
    //document.querySelector('#data-description span').textContent = demo.description;
    d3.select("#data-description span").text(demo.description)
    // Create UI for the demo data options.
    var dataOptionsArea = document.getElementById('data-options');
    dataOptionsArea.innerHTML = '';
    optionControls = demo.options.map(function(option, i) {
      var value = initializeFromState ? GLOBALS.state.demoParams[i] : option.start;
      return makeSlider(dataOptionsArea, option.name,
          option.min, option.max, value);
    });

    menuDiv.selectAll(".demo-data")
      .classed("selected", false)
      .filter(function(d,i) { return i === index })
      .classed("selected", true)

    updateParameters();
  }

  // run initial demo;
  setTimeout(function() {
    showDemo(GLOBALS.state.demo, true);
    // hide the share link initially
    d3.select("#share").style("display", "none")
  },1);

  d3.select(window).on("popstate", function() {
    setTimeout(function() {
      //updateParameters();
      setStateFromParams();
      showDemo(GLOBALS.state.demo, true)
    },1)
  })

  d3.select(window).on("scroll.playground", function() {
    if(scrollY > 1000) {
      if(GLOBALS.playgroundRunning) {
        setRunning(false);
      }
    } else {
      if(!GLOBALS.playgroundRunning) {
        // setRunning(true)
      }
    }
  })

  document.querySelector('#multiply').addEventListener('click', e => {
    var el = document.createElement('div');
    document.querySelector('#playground-multiples').appendChild(el);
    
    // share data
    var points = demo.generator.apply(null, GLOBALS.state.demoParams);

    const base = GLOBALS.state;
    const nNeighbors = parseInt(base.nNeighbors, 10);
    const minDist = parseInt(base.minDist, 10);
    const spread = parseInt(base.spread, 10);
    const diffs = [-99, -50, -20, -10, -1, 2, 5, 99].map(n => n/100);

    const nMultiples = 6;
    let n = 0;

    function make() {
      const state = {
        ...base,
        nNeighbors: Math.round(100 * noise(nNeighbors, sample(diffs))) / 100,
        minDist: Math.round(100 * noise(minDist, sample(diffs))) / 100,
        spread: Math.round(100 * noise(spread, sample(diffs))) / 100
      };
      makeMultiple(el, points, state);
      n = n + 1;

      if (n < nMultiples) {
        setTimeout(make, 20);
      }
    }

    make();
  });

  // +/-percentage
  function noise(value, percentage) {
    const diff = (Math.random()*(value * percentage * 2)) - (value * percentage);
    return value + diff;
  }

  function sample(values) {
    const index = Math.floor(Math.random() * values.length);
    return values[index];
  }

  function makeMultiple(containerEl, points, state) {
    var el = document.createElement('div');
    el.classList.add('Multiple');
    containerEl.appendChild(el);

    // Set up t-SNE and start it running.
    var canvas = document.createElement('canvas');
    canvas.style.width = '200px';
    canvas.width = '200';
    canvas.style.height = '200px';
    canvas.height = 200;
    el.appendChild(canvas);

    // if there was already a playground demo going, lets destroy it and make a new one
    // if(GLOBALS.playgroundDemo) {
    //   GLOBALS.playgroundDemo.destroy();
    //   delete GLOBALS.playgroundDemo;
    // }

    // const playgroundDemo = 
    // GLOBALS.state
    var stateEl = document.createElement('div');
    el.appendChild(stateEl);
    el.classList.add('MultipleState');
    stateEl.textContent = [
      `nNeighbors: ${state.nNeighbors.toFixed(0)}`,
      `minDist: ${(state.minDist/1000).toFixed(3)}`,
      `spread: ${(state.spread/100).toFixed(2)}`
    ].join('   ');

    //runPlayground(points, canvas, GLOBALS.state, function(step) {
    const unpausedBefore = GLOBALS.unpausedBefore;
    const stepLimit = GLOBALS.stepLimit;
    var stepEl = document.createElement('div');
    el.appendChild(stepEl);
    const playgroundDemo = demoMaker(points, canvas, state, function(step) {
      d3.select(stepEl).text(`step: ${format(step)}`);
      if(step >= stepLimit && !unpausedBefore) {
        playgroundDemo.pause();
      }
    })
  }
}
