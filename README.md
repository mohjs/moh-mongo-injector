# moh-mongo-injector
Inject JSON data into mongo serially with reference available.

## Demo

```
const injector = require('moh-mongo-injector')
const app = require('./server/server')

let SpecialDate = [
  {
    title: '2017元旦1',
    started: '2016-12-31T16:00:00.000Z',
    ended: '2017-01-01T16:00:00.000Z'
  },
  {
    title: '2017元旦',
    started: '2016-12-31T16:00:00.000Z',
    ended: '2017-01-01T16:00:00.000Z'
  },
  {
    title: '2017元旦2',
    started: '2016-12-31T16:00:00.000Z',
    ended: '2017-01-01T16:00:00.000Z'
  }
]

let Hello = [
  {
    priority: 0,
    content: '低优先级问候[0]'
  },
  {
    priority: 8,
    content: '高优先级问候1[8]'
  },
  {
    priority: 8,
    content: '高优先级问候2[8]'
  },
  {
    priority: 6,
    content: '高优先级非生元旦测试1',
    general: {
      isBirthday: false
    },
    specialDateIds: ['#SpecialDate#title#2017元旦']
  },
  {
    priority: 6,
    content: '高优先级非生元旦测试2',
    specialDateIds: ['#SpecialDate#title#2017元旦']
  },
  {
    priority: 5,
    content: '高优先级非生元旦测试1',
    general: {
      isBirthday: true
    },
    specialDateIds: ['#SpecialDate#title#2017元旦']
  }
]

injector({SpecialDate, Hello}, {models: app.models})

```