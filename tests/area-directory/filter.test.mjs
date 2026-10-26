import test from 'node:test';
import assert from 'node:assert/strict';
import {filterAreas} from '../../src/app/components/area-directory.mjs';
const rows=[{city:'Michigan City',neighborhood:null,state_code:'IN',is_active:true},{city:'Michigan City',neighborhood:'Downtown',state_code:'IN',is_active:true},{city:'Hobart',neighborhood:'Downtown',state_code:'IN',is_active:false}];
test('blank search includes cities and neighborhoods, including inactive entries',()=>assert.equal(filterAreas(rows,'  ').length,3));
test('city search is case insensitive and trimmed',()=>assert.equal(filterAreas(rows,'  MICHIGAN city ').length,2));
test('neighborhood search retains the correct city association',()=>assert.deepEqual(filterAreas(rows,'downtown').map(r=>r.city),['Michigan City','Hobart']));
test('search supports state and has honest zero matches',()=>{assert.equal(filterAreas(rows,'in').length,3);assert.equal(filterAreas(rows,'missing').length,0);});
