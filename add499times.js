const { getCaptcha } = require('./capthaSolver.js');

const main = async () =>{
    for(let i = 1; i <= 500; i++){
        await getCaptcha(i);  
    }
}
main(); 