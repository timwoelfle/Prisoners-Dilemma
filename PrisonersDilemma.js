/*
 * Prisoner's Dilemma Visualized v1.11
 * http://prisoners-dilemma.timwoelfle.de
 *
 * Copyright by Tim Wölfle (http://timwoelfle.de)
 * Licensed under the GPL Version 3 license (http://www.gnu.org/licenses/gpl-3.0.txt)
 *
 */

var Sx, Sy, players, isResultMatrix;

function createVisualization() {
	var matrix = [], p, q, markovT, eig, v, vsum, vnorm;

	players.forEach(function(playerX, idX) {
		p = playerX;
		matrix[idX] = [];
		players[idX].gets = 0;
		players[idX].gives = 0;
		players[idX].wins = 0;
		players.forEach(function(playerY, idY) {
			if (!matrix[idY]) {
				matrix[idY] = [];
			}
			q = playerY;

			// No possibilities but already result matrix provided
			if (isResultMatrix) {
				matrix[idX][idY] = p[idY + 1];
				matrix[idY][idX] = q[idX + 1];
			// Calculate stochastic turnout based on Eigenvectors
			} else {
				markovT = [
					[p[1] * q[1], p[2] * q[3], p[3] * q[2], p[4] * q[4]],
					[p[1] * [1 - q[1]], p[2] * [1 - q[3]], p[3] * [1 - q[2]], p[4] * [1 - q[4]]],
					[[1 - p[1]] * q[1], [1 - p[2]] * q[3], [1 - p[3]] * q[2], [1 - p[4]] * q[4]],
					[[1 - p[1]] * [1 - q[1]], [1 - p[2]] * [1 - q[3]], [1 - p[3]] * [1 - q[2]], [1 - p[4]] * [1 - q[4]]]
				];
				eig = Matrix.eigenstructure(Matrix.create(markovT));
				v = Matrix.transpose(eig.V).mat[0];

				// Exception for TFT vs TFT: first transposed eigenvector leads to pessimstic scenario (one player starts with defection instead of cooperation)
				if (p[1] === 1 && p[2] === 0 && p[3] === 1 && p[4] === 0 && q[1] === 1 && q[2] === 0 && q[3] === 1 && q[4] === 0) {
					v = [1, 0, 0, 0];
				}

				vsum = v.reduce(function(a, b) { return a + b; });
				vnorm = Matrix.scale(Matrix.create([v]), 1 / vsum);
				matrix[idX][idY] = Matrix.mult(vnorm, Matrix.create(Sx)).mat[0][0];
				matrix[idY][idX] = Matrix.mult(vnorm, Matrix.create(Sy)).mat[0][0];
			}

			// Calculate table information
			players[idX].gets += matrix[idX][idY];
			players[idX].gives += matrix[idY][idX];
			players[idX].ratio = players[idX].gets / players[idX].gives;
			players[idX].wins += d3.round(matrix[idX][idY], 2) > d3.round(matrix[idY][idX], 2);
		});
	});

	/* Create table */

	d3.selectAll("#overview thead th").data([0, 0, "gets", "gives", "ratio", "wins"]).on("click", function(k) {
		tr.sort(function(a, b) { return b[k] - a[k]; });
	});

	d3.select("#overview tbody").selectAll("tr").remove();

	var tr = d3.select("#overview tbody").selectAll("tr").data(players).enter().append("tr")
		.on("mouseover", function(d, i) { fade(0.1, i); })
		.on("mouseout", function(d, i) { fade(1, i); });

	tr.append("td")
		.text(function(d, i) { return i + 1; });
	tr.append("th")
		.text(function(d) { return d[0]; });
	tr.append("td")
		.text(function(d) { return d3.round(d.gets / players.length, 2); });
	tr.append("td")
		.text(function(d) { return d3.round(d.gives / players.length, 2); });
	tr.append("td")
		.text(function(d) { return d3.round(d.ratio, 2); });
	tr.append("td")
		.text(function(d) { return d.wins; });

	/* Create chord diagram */

	d3.select("svg g g").remove();

	var chord = d3.layout.chord()
		.padding(0.05)
		.sortSubgroups(d3.descending)
		.sortGroups(d3.descending)
		.matrix(matrix);

	var width = 500,
		height = 500,
		innerRadius = Math.min(width, height) * 0.45,
		outerRadius = innerRadius * 1.1;

	var colors = ["#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"];

	function fill(i) {
		if (isResultMatrix) {
			return colors[i % 20];
		}
		var generosity = (players[i][1] + players[i][2] + players[i][3] + players[i][4]) / 4;
		if (generosity <= 0.5) {
			return d3.interpolateRgb(d3.rgb(214, 39, 40), d3.rgb(127, 127, 127))(generosity * 2).toString();
		} else {
			return d3.interpolateRgb(d3.rgb(127, 127, 127), d3.rgb(44, 160, 44))((generosity - 0.5) * 2).toString();
		}
	}

	function names(i) { return players[i][0]; }

	var svg = d3.select("svg g").append("g");

	// Groups
	var g = svg.append("g").selectAll("g")
		.data(chord.groups)
	  .enter().append("g")
		.on("mouseover", function(d, i) { fade(0.1, i); })
		.on("mouseout", function(d, i) { fade(1, i); });

	g.append("title").text(function(d) { return names(d.index) + "\nAverage payoff: " + d3.round(d.value / players.length, 2); });

	g.append("path")
		.style("fill", function(d) { return fill(d.index); })
		.style("stroke", function(d) { return fill(d.index); })
		.attr("id", function(d) { return "group" + d.index; })
		.attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius));

	g.append("text")
		.attr("x", 6)
		.attr("dy", 15)
	  .append("textPath")
		.attr("xlink:href", function(d) { return "#group" + d.index; })
		.text(function(d) { return names(d.index); })
		.text(function(d, i) { // Repeat .text call because now getComputedTextLength is available and too long texts can be shortened
			var textTooLong = (d3.select("path#group" + i)[0][0].getTotalLength() / 2 - 25) / this.getComputedTextLength();
			if (textTooLong < 1) {
				return names(d.index).substr(0, names(d.index).length * textTooLong - 2) + "…";
			} else {
				return names(d.index);
			}
		});

	// Chords
	svg.append("g")
		.attr("class", "chord")
	  .selectAll("path")
		.data(chord.chords)
	  .enter().append("path")
		.attr("d", d3.svg.chord().radius(innerRadius))
		.style("fill", function(d) { return (d3.round(d.source.value, 2) === d3.round(d.target.value, 2)) ? "#ddd" : fill((d.source.value > d.target.value) ? d.source.index : d.target.index); })
		.style("opacity", 1)
		.on("mouseover", function(d, i) { fade2(0.1, d.source.index, d.target.index); })
		.on("mouseout", function(d, i) { fade2(1, d.source.index, d.target.index); })
	  .append("title")
		.text(function(d) { return ((d.target.value === d.source.value) ? "Tie!\n" : "") + d3.round(d.target.value, 2) + " points: " + names(d.target.index) + ((d.target.value > d.source.value) ? " (Winner)\n" : "\n") + d3.round(d.source.value, 2) + " points: " + names(d.source.index) + ((d.source.value > d.target.value) ? " (Winner)" : ""); });

	// Returns an event handler for fading a given chord group.
	function fade(opacity, i) {
		svg.selectAll(".chord path").filter(function(d) { return d.source.index !== i && d.target.index !== i; })
			.style("opacity", opacity);
	}
	
	function fade2(opacity, i, j) {
		g.filter(function(d, index) { return (index !== i && index !== j); })
			.style("opacity", opacity);
		svg.selectAll(".chord path").filter(function(d) { return (d.source.index !== i || d.target.index !== j); })
			.style("opacity", opacity);
	}
	
	/* Create payoff matrix table */
	var newLine;
	d3.selectAll("#calculatedResultMatrix thead th").remove();
	d3.selectAll("#calculatedResultMatrix tbody tr").remove();
	d3.select("#calculatedResultMatrix thead tr").selectAll("th").data(players).enter().append("th").html(function(d) { return d[0]; });
	newLine = d3.select("#calculatedResultMatrix tbody").selectAll("tr").data(players).enter().append("tr");
	newLine.append("th").html(function(d) { return d[0]; });
	newLine.selectAll("td").data(function(d,i) { return matrix[i]; }).enter().append("td").html(function(d) { return d3.round(d,2); });
}

function parseCSVInput(CSVstring) {
	return d3.csv.parseRows(CSVstring.trim(), function(row, i) {
		row = row.map(function(column, i) {
			// Trim every column and ignore comments indicated by #
			column = column.trim().split("#")[0];

			// Check if the number of columns is 5 (for strategies) or n+1 (n=rows for own result matrix)
			if ((!isResultMatrix && row.length !== 5) ||
				(isResultMatrix && row.length !== d3.select("#ownResultMatrix textarea").property("value").split("\n").length + 1)) {
				return false;
			}

			// First column is the player"s name
			if (!i) {
				return column;
			}
			// Now the likelihood / result matrix values
			else {
				// If there"s a single / it means division
				if (column.split("/").length === 2) {
					column = +column.split("/")[0] / +column.split("/")[1];
				}
				// Column has to be a number
				if (isNaN(+column)) {
					return false;
				}
				// For strategies likelihood values have to be between 0-1
				if (!isResultMatrix && (+column < 0 || +column > 1)) {
					return false;
				}
				return +column;
			}
		});

		// If a single column returns false make the whole row false so that the loadStrategies / loadResultMatrix know about parsing mistake
		if (row.indexOf(false) !== -1) {
			return false;
		} else {
			return row;
		}
	});
}

function loadStrategies() {
	isResultMatrix = 0;
	players = parseCSVInput(d3.select("#strategies textarea").property("value"));
	Sx = ["#reward", "#sucker", "#temptation", "#punishment"].map(function(d) { return [+d3.select(d).property("value")]; });
	Sy = [Sx[0], Sx[2], Sx[1], Sx[3]];
	if (players.indexOf(false) !== -1) {
		d3.select("#strategies textarea").classed("faulty", true);
	} else {
		d3.select("#strategies textarea").classed("faulty", false);
		createVisualization();
	}
}

function changePayoffMatrix(t, r, p, s) {
	d3.select("#temptation").property("value", t);
	d3.select("#reward").property("value", r);
	d3.select("#punishment").property("value", p);
	d3.select("#sucker").property("value", s);
	loadStrategies();
}

function loadResultMatrix() {
	isResultMatrix = 1;
	players = parseCSVInput(d3.select("#ownResultMatrix textarea").property("value"));
	if (players.indexOf(false) !== -1) {
		d3.select("#ownResultMatrix textarea").classed("faulty", true);
	} else {
		d3.select("#ownResultMatrix textarea").classed("faulty", false);
		createVisualization();
	}
}

/* Update table and chord diagram when forms are changed */

d3.selectAll("#strategies input").on("change", loadStrategies);
d3.select("#strategies textarea").on("change", loadStrategies);
d3.select("#ownResultMatrix textarea").on("change", loadResultMatrix);

d3.select("#standardPayoffMatrix").on("click", function() { changePayoffMatrix(5, 3, 1, 0); });
d3.select("#traditionalPayoffMatrix").on("click", function() { changePayoffMatrix(0, -1, -2, -3); });

d3.select("#chose span:first-child").on("click", function() {
	d3.select("#chose span:first-child").classed("inactive", false);
	d3.select("#chose span:last-child").classed("inactive", true);
	d3.select("#strategies").classed("hidden", false);
	d3.select("#ownResultMatrix").classed("hidden", true);
	loadStrategies();
});
d3.select("#chose span:last-child").on("click", function() {
	d3.select("#chose span:first-child").classed("inactive", true);
	d3.select("#chose span:last-child").classed("inactive", false);
	d3.select("#strategies").classed("hidden", true);
	d3.select("#ownResultMatrix").classed("hidden", false);
	loadResultMatrix();
});

/* Initialize: load strategies */

loadStrategies();