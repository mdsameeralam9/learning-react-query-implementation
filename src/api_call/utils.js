export function getDifferenceInMs({ startTime, endTime }) {
  return endTime - startTime
}

export async function handlePromise({ promise, finallyCb }) {
  try {
    const result = await promise
    return [result, null]
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))]
  } finally {
    finallyCb?.()
  }
}

export function isPlainObject(o) {
  if (!hasObjectPrototype(o)) {
    return false
  }

  // If has no constructor

  const ctor = o.constructor
  if (ctor === undefined) {
    return true
  }

  // If has modified prototype
  const prot = ctor.prototype
  if (!hasObjectPrototype(prot)) {
    return false
  }

  // If constructor does not have an Object-specific method
  // eslint-disable-next-line no-prototype-builtins
  if (!prot.hasOwnProperty('isPrototypeOf')) {
    return false
  }

  // Handles Objects created by Object.create(<arbitrary prototype>)
  if (Object.getPrototypeOf(o) !== Object.prototype) {
    return false
  }

  // Most likely a plain Object
  return true
}

function hasObjectPrototype(o) {
  return Object.prototype.toString.call(o) === '[object Object]'
}

export function hashKey(queryKey) {
  return JSON.stringify(queryKey, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce(
            (result, key) => {
              result[key] = val[key]
              return result
            },
            {}
          )
      : val
  )
}