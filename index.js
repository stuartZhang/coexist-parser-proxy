module.exports = (req, res, next) => {
    req._buffer_ = Buffer.alloc(0);
    const cacheEvent = {};
    const otherEventHandle = type => event => {
        cacheEvent[type] = event;
    };
    req.once('aborted', otherEventHandle('aborted'));
    req.once('close', otherEventHandle('close'));
    req.once('error', otherEventHandle('error'));
    req.once('end', otherEventHandle('end'));
    req.once('end', () => {
        process.nextTick(() => {
            req._readableState.endEmitted = false;
        });
        req._on_ = req.on;
        const callbacks = [];
        req.on = (type, callback) => {
            if (type === 'data') {
                process.nextTick(() => {
                    callback(req._buffer_);
                    if (callbacks.length > 0) {
                        process.nextTick(() => {
                            callbacks.forEach(cb => cb());
                            callbacks.length = 0;
                        });
                    }
                });
            } else if (type === 'end') {
                if ('end' in cacheEvent) {
                    callbacks.push(() => callback(cacheEvent.end));
                }
            } else if (type in cacheEvent) {
                process.nextTick(() => {
                    callback(cacheEvent[type]);
                });
            }
            return req;
        };
        next();
    });
    req.once('data', chunk => {
        req._buffer_ = Buffer.concat([req._buffer_, chunk]);
    });
};
