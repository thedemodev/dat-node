const fs = require('fs')
const path = require('path')
const test = require('tape')
const rimraf = require('rimraf')
const tmpDir = require('temporary-directory')

const Dat = require('..')
const fixtures = path.join(__dirname, 'fixtures')

test('misc: clean old test', (t) => {
  rimraf(path.join(fixtures, '.dat'), t.end)
})

test('misc: empty dat folder ok', (t) => {
  fs.mkdir(path.join(fixtures, '.dat'), async () => {
    const dat = await Dat(fixtures)

    await dat.close()
    rimraf.sync(path.join(fixtures, '.dat'))
    t.end()
  })
})

test('misc: existing invalid dat folder', (t) => {
  fs.mkdir(path.join(fixtures, '.dat'), () => {
    fs.writeFile(path.join(fixtures, '.dat', 'metadata.key'), 'hi', async () => {
      try {
        await Dat(fixtures, { errorIfExists: true })
      } catch (e) {
        t.ok(e, 'errors')
        rimraf.sync(path.join(fixtures, '.dat'))
        t.end()
      }
    })
  })
})

test('misc: non existing invalid dat path', async (t) => {
  try {
    await Dat('/non/existing/folder/')
  } catch (e) {
    t.ok(e, 'errors')
    t.end()
  }
})

test('misc: expose .key', async (t) => {
  const key = Buffer.alloc(32)
  const dat = await Dat(process.cwd(), { key: key, temp: true })
  t.deepEqual(dat.key, key)
  await dat.close()

  const dat2 = await Dat(fixtures, { temp: true })
  t.notDeepEqual(dat2.key, key)
  await dat2.close()
  t.end()
})

test('misc: expose .writable', async (t) => {
  tmpDir(async (err, downDir, cleanup) => {
    t.error(err, 'error')
    const shareDat = await Dat(fixtures)
    t.ok(shareDat.writable, 'is writable')
    await shareDat.joinNetwork()

    const downDat = await Dat(downDir, { key: shareDat.key })
    t.notOk(downDat.writable, 'not writable')

    await shareDat.close()
    await downDat.close()
    cleanup((err) => {
      rimraf.sync(path.join(fixtures, '.dat'))
      t.error(err, 'error')
      t.end()
    })
  })
})

test('misc: expose swarm.connected', async (t) => {
  tmpDir(async (err, downDir, cleanup) => {
    t.error(err, 'error')

    const shareDat = await Dat(fixtures, { temp: true })
    try {
      shareDat.leave()
      t.pass('leave before join should be noop')
    } catch (e) {
      t.fail('should not error')
    }

    const network = await shareDat.joinNetwork()
    t.equal(network.connected, 0, '0 peers')

    const downDat = await Dat(downDir, { key: shareDat.key, temp: true })
    await downDat.joinNetwork()

    network.once('connection', async () => {
      t.ok(network.connected >= 1, '>=1 peer')
      await downDat.close()
      await shareDat.close()
      cleanup(t.end)
    })
  })
})

test('misc: close twice errors', async (t) => {
  const dat = await Dat(fixtures, { temp: true })
  await dat.close()
  try {
    await dat.close()
    t.fail('should error')
    t.end()
  } catch (e) {
    t.ok(e, 'errors')
    t.end()
  }
})

test('misc: close twice sync errors', async (t) => {
  const dat = await Dat(fixtures, { temp: true })
  dat.close()
  try {
    await dat.close()
    t.fail('should error')
    t.end()
  } catch (e) {
    t.ok(e, 'errors')
    process.nextTick(t.end)
  }
})

test('misc: make dat with random key and open again', async (t) => {
  tmpDir(async (err, downDir, cleanup) => {
    t.error(err, 'error')
    var key = '6161616161616161616161616161616161616161616161616161616161616161'
    const dat = await Dat(downDir, { key: key })
    await dat.close()

    const dat2 = await Dat(downDir, { key: key })
    t.ok(dat2)
    await dat2.close()
    cleanup(t.end)
  })
})
