/*jslint indent: 2, nomen: true, maxlen: 100, white: true, plusplus: true, unparam: true */
/*global require, applicationContext*/

////////////////////////////////////////////////////////////////////////////////
/// @brief A Simple Queueing API
///
/// @file
///
/// DISCLAIMER
///
/// Copyright 2014 ArangoDB GmbH, Cologne, Germany
/// Copyright 2004-2014 triAGENS GmbH, Cologne, Germany
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///
/// Copyright holder is ArangoDB GmbH, Cologne, Germany
///
/// @author Frank Celler
/// @author Copyright 2014, ArangoDB GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

(function () {
  'use strict';

  var console = require("console");

  var Foxx = require("org/arangodb/foxx"),
      arangodb = require("org/arangodb"),
      actions = require("org/arangodb/actions"),
      joi = require("joi");

  var db = arangodb.db,
      Controller = Foxx.Controller,
      controller = new Controller(applicationContext),
      queue = applicationContext.collectionName("queue");

  var STATUS_PENDING = 1,
      STATUS_WORKING = 2,
      STATUS_FINISHED = 3;

  // .............................................................................
  // creates a new job
  // .............................................................................

  controller.post('/job', function (req, res) {
    var job = req.body();

    var key = db._executeTransaction({
      'collections': { 'write': queue },
      'action': function () {
        var jobs = (Foxx.createQuery("FOR j IN @@queue FILTER j.status == @pending && j.type == @type && j.identifier == @identifier SORT j.priority LIMIT 1 RETURN j"))({
          '@queue': queue,
          'pending': STATUS_PENDING,
          'type': job.type,
          'identifier': job.identifier
        });

        var now = (new Date()).getTime();
        var prio = now / 1000.0;
        var notBefore = job.notBefore;

        if (! notBefore) {
          notBefore = now;
        }

        if (0 < jobs.length) {
          var j = jobs[0];

          if (j.notBefore < notBefore) {
            db._collection(queue).update(j._id, { 'notBefore': notBefore });
          }

          return j._key;
        }

        var result = db._collection(queue).save({
          'type': job.type,
          'identifier': job.identifier,
          'data': job.data,
          'status': STATUS_PENDING,
          'priority': prio,
          'notBefore': notBefore
        });

        return result._key;
      }
    });

    res.json({ 'key': key });
  });

  // .............................................................................
  // returns the next pending job
  // .............................................................................

  controller.post("/worker", function (req, res) {
    var now = (new Date()).getTime();

    var job = db._executeTransaction({
      'collections': { 'write': queue },
      'action': function () {
        var jobs = (Foxx.createQuery("FOR j IN @@queue FILTER j.status == @pending && j.notBefore <= @now SORT j.priority LIMIT 1 RETURN j"))({
          '@queue': queue,
          'pending': STATUS_PENDING,
          'now': now
        });

        if (0 === jobs.length) {
          return {
            "job": null
          };
        }

        var job = jobs[0];

        db._collection(queue).update(job, { status: STATUS_WORKING });

        return {
          "job": {
            "key": job._key,
            "type": job.type,
            "identifier": job.identifier,
            "data": job.data
          }
        };
      }
    });

    res.json(job);
  });

  // .............................................................................
  // returns the next pending job
  // .............................................................................

  controller.del("/job/:key", function (req, res) {
    db._collection(queue).update(req.params("key"), { status: STATUS_FINISHED });

    res.json({});
  }).pathParam("key", joi.string().regex(/^[0-9]+$/).required().description("job key"));
}());

// -----------------------------------------------------------------------------
// --SECTION--                                                       END-OF-FILE
// -----------------------------------------------------------------------------

// Local Variables:
// mode: outline-minor
// outline-regexp: "/// @brief\\|/// {@inheritDoc}\\|/// @page\\|// --SECTION--\\|/// @\\}"
// End:
