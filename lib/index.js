const fs = require('fs')
const Promise = require('bluebird')
const debug = require('moh-logger').debug('moh-mongo-injector')
const { info, warn, error } = require('moh-logger')

const foreignRegx = /(#[\u4e00-\u9fa5_a-zA-Z0-9]+)+(\$[a-zA-Z0-9]+)?/g

const removeFromArray = (arr, item) => {
  const itemIndex = arr.indexOf(item)
  if (itemIndex >= 0) {
    arr.splice(itemIndex, 1)
  }
  return arr
}

const generateReferences = (source) => new Promise(
  (resolve, reject) => {
    // Generate references list in the source and model depends
    const modelNames = Object.keys(source)
    const data = modelNames.map(model => source[model])
    let modelDepends = {}

    let references = data.reduce((pre, cur, index) => {
      const foreignRefs = JSON.stringify(cur).match(foreignRegx)
      modelDepends[modelNames[index]] = []
      if (foreignRefs !== null) {
        foreignRefs.forEach(ref => {
          if (!pre.hasOwnProperty(ref)) {
            pre[ref] = null

            if (modelDepends[modelNames[index]].indexOf(ref.split('#')[1]) < 0) {
              modelDepends[modelNames[index]].push(ref.split('#')[1])
            }
          }
        })
      }
      return pre
    }, {})

    resolve([references, modelDepends])
  })

const caculateOrder = (modelNames, modelDepends, injectOrders = []) => new Promise(
  (resolve, reject) => {
    let toInjectModelNames = modelNames.filter(name => {
      return modelDepends[name].length <= 0
    })

    injectOrders.push(toInjectModelNames)

    toInjectModelNames.forEach(name => {
      removeFromArray(modelNames, name)

      Object.keys(modelDepends).forEach(nameKey => {
        removeFromArray(modelDepends[nameKey], name)
      })
    })

    if (modelNames.length > 0) {
      caculateOrder(modelNames, modelDepends, injectOrders)
    }
    resolve(injectOrders)
  })

const injectData = (source, dbModels, references, injectOrders) => new Promise(
  (resolve, reject) => {
    const injectPromises = injectOrders.map(orderStep => () => new Promise((resolve, reject) => {
      Promise.props(orderStep.reduce((promiseObj, name, index) => {
        promiseObj[name] = Promise.mapSeries(source[name].map(instance => () => {
          return dbModels[name].create(instance)
        }), instancePromise => instancePromise())
        return promiseObj
      }, {}))
      .then(result => {
        // Update source with db foeignKeys
        updateReferences(source, references, result)
          .then(newSource => {
            source = newSource
            resolve(result)
          })
      })
    }))

    return Promise.mapSeries(injectPromises, injectPromise => injectPromise())
      .then(result => {
      })
      .then(resolve)
  })

const updateReferences = (source, references, result) => new Promise(
  (resolve, reject) => {
    const stepNames = Object.keys(result)

    stepNames.map(name => {
      const targetRefs = Object.keys(references).filter(ref => ref.indexOf(`#${name}`) === 0)

      targetRefs.forEach(reference => {
        const modelName = reference.split('#')[1]
        const targetField = reference.split('#')[2]
        const targetValue = reference.split('#')[3]
        const targetFK = reference.split('#')[4] || 'id'

        for (var i = 0; i < result[modelName].length; i++) {
          const data = result[modelName][i]
          if (data[targetField] === targetValue) {
            references[reference] = data[targetFK]
            // TOFIX: return the loop bot not all
          }
        }

        source = JSON.parse(
          JSON.stringify(source).replace(
            new RegExp(reference, 'g'), references[reference]
          )
        )
      })
    })
    resolve(source)
  })

module.exports = async (source, config, cb) => {
  let modelNames = Object.keys(source)
  const dbModels = config.models
  if (modelNames.length > 0) {
    // Array of json data source
    try {
      let [references, modelDepends] = await generateReferences(source)
      let injectOrders = await caculateOrder(modelNames, modelDepends)
      if (!cb) {
        // return promise
        return injectData(source, dbModels, references, injectOrders)
      } else {
        await injectData(source, dbModels, references, injectOrders)
        .then(result => {
          cb(null, result)
        })
        .catch(cb)
      }
    } catch (err) {
      if (!cb) {
        return Promise.reject(err)
      } else {
        cb(err)
      }
    }
  } else {
    // TODO: Add file path loader
  }
}