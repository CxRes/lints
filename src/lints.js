/*jslint node, es6, maxlen: 80 */

"use strict";

const R = require("ramda");
const Bluebird = require("bluebird");

const parseGlobs = require("./parse-globs");
const groupByFiles = require("./group-by-files");
const promiseOptions = require("./promise-options");
const promiseFiles = require("./promise-files");

const promiseConfig = R.pipeP(
    parseGlobs,
    groupByFiles,
    promiseOptions,
    promiseFiles
);

module.exports = function lints(config) {
    const promisedConfig = promiseConfig(config);

    return Bluebird
        .props(promisedConfig)
        .then(function ({fileLinters, linterConfigs, promisedFiles}) {
                const linters = R.mapObjIndexed(
                    (linterConfig, linterName) => require(linterName)(linterConfig),
                    linterConfigs
                );

                const promisedWarnings = R.mapObjIndexed(
                    (linterNames, fileName) => Bluebird.map(
                        linterNames,
                        (linterName) => linters[linterName]({
                            fileName,
                            promisedFile: promisedFiles[fileName]
                        })
                    ),
                    fileLinters
                );

                return Bluebird.props(promisedWarnings);
        });
};
