export const colors = {
	// Gray Scale
	grayScale: {
		xlight: 'rgb(76, 76, 76)',
		light: 'rgb(51, 51, 51)',
		base: 'rgb(35, 35, 35)',
		dark: 'rgb(20, 20, 20)',
		xdark: 'rgb(0, 0, 0)',
	},

	// Blue Scale
	blueScale: {
		xlight: 'rgb(5, 199, 204)',
		light: 'rgb(2, 178, 191)',
		base: 'rgb(1, 153, 174)',
		dark: 'rgb(1, 111, 119)',
		xdark: 'rgb(2, 79, 81)',
	},

	// White Scale
	whiteScale: {
		xlight: 'rgb(255, 255, 255)',
		light: 'rgb(241, 242, 237)',
		base: 'rgb(223, 226, 217)',
		dark: 'rgb(177, 178, 175)',
		xdark: 'rgb(140, 140, 140)',
	},

	// Red Scale for explosion effects
	redScale: {
		xlight: 'rgb(255, 102, 102)',
		light: 'rgb(255, 51, 51)',
		base: 'rgb(255, 0, 0)',
		dark: 'rgb(204, 0, 0)',
		xdark: 'rgb(153, 0, 0)',
	},
} as const;

// Convenience exports for commonly used colors
export const {grayScale, blueScale, whiteScale, redScale} = colors;
