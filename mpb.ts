import { MultiProgressBars } from 'multi-progress-bars';
import {red} from "yoctocolors-cjs"


async function main(){
// Initialize mpb
const mpb = new MultiProgressBars({
    initMessage: ' $ Example Fullstack Build ',
    anchor: 'top',
    persist: true,
    border: true,
});

// Add tasks
mpb.addTask('Webpack Backend', { type: 'percentage', barTransformFn: red });
mpb.addTask('Watcher', { type: 'indefinite', message: 'Watching for changes...' });

// Update tasks
mpb.updateTask('Webpack Backend', { percentage: 0.2 });
mpb.incrementTask('Webpack Backend', { percentage: 0.1 });

// Console logging is overridden and tracked with an interval buffer
setInterval(() => { console.log("111") }, 100);


setTimeout(() => { mpb.done('Webpack Backend', { message: 'Build finished.' })}, 5000);
setTimeout(() => { mpb.done('Watcher', { message: 'Build finished.' })}, 1000);

// Wait for all tasks to finish
await mpb.promise;
console.log('Finish');
}

main()