# A Simple Queueing API

This API defines a simple way to manage jobs in a queue.

In order to install this application into your local ArangoDB,
you can use the foxx-manager like this

    foxx-manager install queue-it /queue

This will download the application into your local installation of
ArangoDB (which must be up and running) and mount it under the path
"/queue".

# API

A description object like

    {
      "type": "user",
      "identifier": { name: "fceller" },
      "data": { "url": "some url" },
      "notBefore": 123456778
    }

describes a job. Jobs are considered identical if `type` and `identifier` are
equal. `data` contains additional data for the job. `notBefore` is a
timestamp. The job should not be started before this time.

## `POST /queue/job`

Creates a new job or returns a identical and returns the job identifier as

    { 
      "job" : "707152582" 
    }

## 