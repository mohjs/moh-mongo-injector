'use strict'

const mongoose = require('mongoose')
const source = require('./source')
const injector = require('../')
const Promise = require('bluebird')

mongoose.Promise = Promise

// Init model schema
require('./models/event')(mongoose)
require('./models/user')(mongoose)
require('./models/registration')(mongoose)
require('./models/accessToken')(mongoose)

mongoose.connect('mongodb://127.0.0.1/demo_mongo_injector', {useMongoClient: true})
  .then(() => flashDB())
  .then(() => injector(source, { models: mongoose.models }))
  .catch(err => console.log)


const flashDB = () => Promise.all(mongoose.modelNames().map(modelName => mongoose.model(modelName).collection.remove()))