"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function noCustProps(obj) {
    return Object.getPrototypeOf(obj) === Object.prototype;
}
function subObject(obj) {
    return obj.reduce((acc, cur, idx) => {
        acc[idx.toString()] = cur;
        return acc;
    }, {});
}
function hasNoCustomProperties(obj) {
    let reducer = (acc, elm) => {
        if (!acc)
            return acc;
        return hasNoCustomProperties(elm);
    };
    if (obj instanceof Object) {
        if (obj instanceof Array) {
            return obj.reduce(reducer, true);
        }
        else {
            if (noCustProps(obj)) {
                let values = Object.keys(obj).map(x => obj[x]);
                return values.reduce(reducer, true);
            }
            else
                return false;
        }
    }
    else
        return true;
}
exports.hasNoCustomProperties = hasNoCustomProperties;
function getCustomProperties(obj) {
    return Object.keys(obj).reduce((acc, key) => {
        let element = obj[key];
        if (!hasNoCustomProperties(element)) {
            let subObj = element instanceof Array ? subObject(element) : element;
            if (hasNoCustomProperties(subObj))
                acc.push(key);
            else {
                let subprops = getCustomProperties(subObj);
                if (subprops.length == 0)
                    acc.push(key);
                else
                    subprops.forEach(soKey => acc.push([key, soKey].join("::")));
            }
        }
        return acc;
    }, []);
}
exports.getCustomProperties = getCustomProperties;
