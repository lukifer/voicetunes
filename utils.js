const rnd = (ceil) => Math.floor(ceil * Math.random());
const between = (min, val, max) => Math.min(max, Math.max(min, val));

module.exports = {
	rnd,
	between,
};