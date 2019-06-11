const axios = require('axios');

const googleMapsClient = require('@google/maps').createClient({
    key: '',
    Promise: Promise
});

const getStar = (num) => {
    let starStr = "";
    for (let i = 0 ; i < 5; i++) {
        if(i < Math.round(num)) {
            starStr += "★";
        } else {
            starStr += "☆";
        }
    }
    return starStr;
}

const getPlaceByQuery = async (query) => {
    try {
        let res = await googleMapsClient.places({
            query: query,
            language: 'zh-TW',
            type: 'restaurant'
        }).asPromise();
        if(res.json.status === "ZERO_RESULTS") {
            throw new Error("Not Found");
        } else {
            return res.json.results;
        }
    } catch (error) {
        throw new Error(error);
    }
}

const getPlaceByQueryAndLoc = async (query, location) => {
    try {
        let res = await googleMapsClient.places({
            query: query,
            language: 'zh-TW',
            type: 'restaurant',
            location: location,
            radius: 1500
        }).asPromise();
        if(res.json.status === "ZERO_RESULTS") {
            throw new Error("Not Found");
            
        } else {
            return res.json.results;
        }
    } catch (error) {
        throw new Error(error);
    }
}

const getPlaceDetail = async (placeId) => {
    try {
        let res = await googleMapsClient.place({
            placeid: placeId,
            language: 'zh-TW'
        }).asPromise();
        if(res.json.result){
            return res.json.result;
        } else {
            throw new Error("Place not found");
        }     
    } catch (error) {
        throw new Error(error);
    }
}

const getGeocode = async (loc) => {
    try {
        let res = await googleMapsClient.geocode({address: loc}).asPromise();

        if(res.json.results.length !== 1){
            throw new Error(res.json.results.length);
        }
        
        for (el of res.json.results) {
            //console.log(el.geometry.location);
            return el.geometry.location;
        }
        

    } catch (error) {
        throw new Error(error);
    }
}

const findFood = async (geoCode, far) => {
    try {
        const res = await axios(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?language=zh-TW&location=${geoCode}&radius=${far}&type=restaurant&key=`);
        return res.data.results;
    } catch (error) {
        throw new Error(error);
    }
}

// loc轉成string
const findFoodByLoc = async (loc, far) => {
    try {
        const targetGeoCode = await getGeocode(loc);
        const geoString = `${targetGeoCode.lat},${targetGeoCode.lng}`;

        let food = await findFood(geoString, far);
        let foods = "";
        
        if(food.length !== 0){
            for (let x = 0; x < food.length; x++) {
                foods += food[x].name  + "\n/m_" + (new Buffer(food[x].place_id).toString('base64')) + "\n";          
            }
        }else{
            throw new Error("附近沒有餐廳，再試一次");
        }
        return foods;
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    findFoodByLoc,
    getGeocode,
    getPlaceDetail,
    getPlaceByQuery,
    getPlaceByQueryAndLoc,
    getStar
}