const co = require('co');
module.exports = (req, res, next) => {
    //
    const cacheEvents = {
        aborted: [],
        close: [],
        error: [],
        end: [],
        data: []
    };
    const eventHandleBuild = type => event => {
        cacheEvents[type].push(event);
    };
    //
    const onAborted = eventHandleBuild('aborted');
    const onClose = eventHandleBuild('close');
    const onError = eventHandleBuild('error');
    const onData = eventHandleBuild('data');
    const onEnd = event => {
        if (req.off == null) {
            req.off = req.removeListener;
        }
        req.off('data', onData);
        req.off('aborted', onAborted);
        req.off('close', onClose);
        req.off('error', onError);
        req.off('end', onEnd);
        //
        cacheEvents.end.push(event);
        //
        const waitTick = () => new Promise(resolve => process.nextTick(resolve));
        const endCallbacks = [];
        req._on_ = req.on || req.addListener;
        req._off_ = req.off || req.removeListener;
        //
        req.on = req.addListener = (type, callback) => {
            if (type === 'data') {
                process.nextTick(co.wrap(function *(){
                    for (const dataEvent of cacheEvents.data) {
                        callback(dataEvent);
                        yield waitTick();
                    }
                    for (const endCallback of endCallbacks) {
                        for (const endEvent of cacheEvents.end) {
                            endCallback(endEvent);
                            yield waitTick();
                        }
                    }
                }));
            } else if (type === 'end') {
                endCallbacks.push(callback);
            } else if (type in cacheEvents) {
                process.nextTick(co.wrap(function *(){
                    for (const event of cacheEvents[type]) {
                        callback(event);
                        yield waitTick();
                    }
                }));
            } else {
                console.warn(`[coexist-parser-proxy][addListener]不被支持的事件类型 "${type}"`);
                req._on_(type, callback);
            }
            return req;
        };
        req.off = req.removeListener = (type, callback) => {
            if (cacheEvents[type]) {
                if (callback == null) {
                    cacheEvents[type].length = 0;
                } else {
                    const index = cacheEvents[type].findIndex(cb => cb === callback);
                    if (~index) {
                        cacheEvents[type].splice(index, 1);
                    }
                }
            } else {
                console.warn(`[coexist-parser-proxy][removeListener]不被支持的事件类型 "${type}"`);
                req._off_(type, callback);
            }
        };
        process.nextTick(() => {
            req._readableState.endEmitted = false;
            next();
        });
    };
    req.on('aborted', onAborted);
    req.on('close', onClose);
    req.once('error', onError);
    req.once('end', onEnd);
    req.on('data', onData);
};
