import assert from 'node:assert/strict';
import {calculateInfluentDose} from '../js/influent-dosing-calculator.js';
import {parseDensityKgL} from '../js/product-dosing-profiles.js';

const productDose=calculateInfluentDose({q:'1250',ppm:'15',basis:'product',density:'1.25',activeContent:'40',hours:'24'});
assert.equal(productDose.error,undefined);
assert.equal(productDose.productKgDay,18.75);
assert.equal(productDose.productLDay,15);
assert.equal(productDose.productLHour,0.625);

const activeDose=calculateInfluentDose({q:'1000',ppm:'10',basis:'active',density:'1.25',activeContent:'40',hours:'24'});
assert.equal(activeDose.error,undefined);
assert.equal(activeDose.productKgDay,25);
assert.equal(activeDose.activeKgDay,10);

const massOnly=calculateInfluentDose({q:'1000',ppm:'10',basis:'product',density:'',activeContent:'',hours:'24'});
assert.equal(massOnly.error,undefined);
assert.equal(massOnly.productKgDay,10);
assert.equal(massOnly.productLDay,null);

assert.equal(parseDensityKgL('ca. 1,3 g/cm³'),1.3);
assert.equal(parseDensityKgL('1250 kg/m³'),1.25);
assert.equal(parseDensityKgL('1250 g/l'),1.25);

const missingActive=calculateInfluentDose({q:'1000',ppm:'10',basis:'active',density:'1.2',activeContent:'',hours:'24'});
assert.match(missingActive.error,/Wirkstoffgehalt/);

console.log('Influent dosing calculator tests passed.');
