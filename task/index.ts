import path = require("path");
import tl = require("vsts-task-lib/task");
import exec = require("child_process");
import sec = require("./securefiledownloader");
import glob = require("glob");

async function run(): Promise<void> {
  let secureFileId: string;
  let signCertPassword: string;
  let filePath: string;
  let timeServer: string;
  let hashingAlgorithm: string;
  let secureFileHelpers: sec.SecureFileDownloader;
  let secureFilePath: string;
  try {
    tl.setResourcePath(path.join(__dirname, "task.json"));
    secureFileId = tl.getInput("secureFileId", true);
    signCertPassword = tl.getInput("signCertPassword", true);
    filePath = tl.getInput("filePath", true);
    timeServer = tl.getInput("timeServer", true);
    hashingAlgorithm = tl.getInput("hashingAlgorithm", true);

    console.log("Downloadig secure file " + secureFileId);
    secureFileHelpers = new sec.SecureFileDownloader();
    secureFilePath = await secureFileHelpers.downloadSecureFile(secureFileId);

    glob(filePath, (err, files) => {
      if (err) {
        console.error("Resolving glob failed.");
        console.error(err);
        throw err;
      }

      files.forEach(filePath => sign(filePath, hashingAlgorithm, timeServer, secureFilePath, signCertPassword));
    });

  } catch (err) {
    console.error(err);
    secureFileHelpers.deleteSecureFile();
    tl.setResult(tl.TaskResult.Failed, err);
  }
}

function sign(filePath: string, hashingAlgorithm: string, timeServer: string, secureFilePath: string, signCertPassword: string) : void {  
  var exePath: string = path.resolve(__dirname, "./signtool.exe");
  console.log("Executing signtool at " + exePath + " for file " + filePath + " and certificate " + secureFilePath);

  exec.execFile(
    exePath, 
    ["sign", "/fd", hashingAlgorithm, "/t", timeServer, "/f", secureFilePath, "/p", signCertPassword, filePath],
    (err, data) => {
      if (err) {
        console.error("Signtool failed. Output: ");
        console.error(err);

        throw err.message;
      }

      console.log("Signtool succeeded. Output: ");
      console.log(data);      
    });
}

run();