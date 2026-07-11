"use strict";
const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const input=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'CLDF-Audio-Fingerprints.json');
if(!fs.existsSync(input)){console.error('Datei nicht gefunden: '+input);console.error('Lege CLDF-Audio-Fingerprints.json in den App-Ordner.');process.exit(1);}
const data=JSON.parse(fs.readFileSync(input,'utf8'));
if(data.format!=='CLDF-AUDIO-FINGERPRINTS'||!Array.isArray(data.entries))throw new Error('Ungültige Fingerprint-Datei.');
data.count=data.entries.length;
fs.writeFileSync(path.join(root,'data','audio-fingerprints.json'),JSON.stringify(data,null,2));
fs.writeFileSync(path.join(root,'assets','audio-fingerprints.js'),'window.CLDF_AUDIO_FINGERPRINTS = '+JSON.stringify(data)+';\n');
console.log(data.count+' Audio-Fingerprints wurden eingebaut.');
