
//////////////////////////////////////////
////////////// D3 charts /////////////////
//////////////////////////////////////////

// Document Level Controls //
var axis_title_padding = 60
var total_margin = 60
var margin = {top: total_margin, right: total_margin, bottom: 30, left: total_margin}
var CUSUM_THRESHOLD = 3.0;
//width = window.innerWidth - margin.left - margin.right,
divWidth = +d3.select("#area1").style('width').slice(0, -2), 
width = divWidth - margin.left - margin.right,
//height = window.innerHeight - margin.top - margin.bottom,
divHeight = +d3.select("#area1").style('height').slice(0, -2)
height = divHeight - margin.top - margin.bottom;


// Define group areas for each chart //
var area1 = d3.select("#area1") //Stacked bar chart  
    .append("g"),       
    area2 = d3.select("#area2") //Time series chart 
    .append("g").attr("class","subchart");	   
 
    
// File names //
var filePath = "./files/"
    fileName_acc = "realDonaldTrump_tweets_clean.json",  // twitter account file
    /// array for different hashtags
    title_hash = ['americafirst','draintheswamp','maga','obamacare'],
    last_hash = title_hash[0],    /// keep last called hashtag to redo chart after slider moves
    fileName_pre ="EWA_90_hashtag_",
    fileName_post="_tweets_withCusum.json"

    
//// FOR STACKED BAR CHART ///
// Variables //
var bins = 9,   ///Number of colors to use for legend  from 3 to 11, pick an odd number
    topN = 5,   /// how many filtered hashtags - used for toggle sort
    mod = 3;   /// print every 'mod' ticks on y-axis 


//// FOR TIME SERIES CHART /// 
// Color for trend //
lineColor = "midnightBlue"
// Time Summary Controls //
Time_Summary_Level = "%Y-%m-%d"
// Parses Initial Time //
var parseTime = d3.timeParse("%Y-%m-%d")
// Converts to String & Summarizes to Desired Level //
var formatTime = d3.timeFormat(Time_Summary_Level)
var finalTime = d3.timeParse(Time_Summary_Level)

// Global scales //
var yScale_sb = d3.scaleBand(),
    xScale_sb = d3.scaleLinear(),
    xScale_tl = d3.scaleTime(),
    yScale_tl = d3.scaleLinear();
    
// Y Plot Area //
yDomain = [-1,1] ///[-0.25,0.25]
Axis_Labels = ["Highly Negative","Neutral","Highly Positive"]
//sliderValues = [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9]
sliderValues = [0.1,0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0,5.5,6.0,6.5,7.0,7.5,8.0,8.5]


// Legend on 2nd chart //
var myGreen = d3.rgb(0,255,0,0.1),
    myRed = d3.rgb(255,0,0,0.1),
    myBackg = d3.rgb(234,234,234),
    legend2Data = [["Positive Trend Shift",myGreen,"square"],["Negative Trend Shift",myRed,"square"],["realDonaldTrump Tweets",'lightgrey',"circle"],["Average Sentiment Trend",myBackg,"square"]]

// Plot Texts //
Y_Text_a2 = "Average Sentiment"
X_Text_a1 = "Number of Tweets"
//Title_a0 = "@realDonaldTrump"
//Title_a1 = "Sentiment Analysis by Hashtag"       
Title_a2 = d3.select("#title_a2")
Title_a2_ini = "Historical Sentiment" /// Title_a2

// Add Slider format //
var sliderStep = d3.sliderBottom()
    .max(d3.min(sliderValues))
    .min(d3.max(sliderValues))
    .width(200)
    //.tickFormat( d3.format('.2f)) 
    .ticks(0)   
    //.step(0.1)   ///continuous
    .displayValue(false)
    .default(sliderValues[6])
    .fill(lineColor)
    .on('onchange', val => {
        ///call update
        CUSUM_THRESHOLD = val;
        updateArea2(last_hash);
        
    });



/***********************************/
/***********************************/
//// HORIZONTAL STACKED BAR CHART ///
/***********************************/
/***********************************/

// Add the SVG to the page //
var svg_stack = area1.append("svg")
    .attr("id",'svg_stack')
    .attr("width", width)  
    .attr("height", height+ margin.top + margin.bottom)
    //.attr("transform", "translate(" + -margin.left*2.5 + ",0)")
    .append("g")
    .attr("transform", "translate(" + margin.left*2 + "," + margin.top/2 + ")");


// Toggle control //
var tog = area1.append("div") 
    .attr("id","form-type-checkbox")
    .selectAll("input")
    .data([1])
    .enter()
    .append("label")
    .text("Sort ")
    .append("input")
    .attr("id","sort")
    .attr("type","checkbox");

        
// Tooltip controls //
// Set the tooltip for first chart -- translate on css //
var tip1 = d3.select("#area1")
    .append("div")
    .attr("class", "tooltipsmall")
    .style('display', 'none');
    

// Set the tooltip for second chart -- translate on css //
var tip2 = d3.select("#area2")  
    .append("div") 
    .attr("class", "tooltip")
    .style('display', 'none');
    

//Slider area for 2nd chart //
var gStep = d3
    .select('div#area3')
    .append('svg')
    .attr("id","slider")
    .attr('width', 300)
    .attr('height', 80)   
    .attr('transform', 'translate(780,0)')     // 780,0
    .append('g').attr('transform', 'translate(14,10)')
    
    
//Slider text
    d3.select("#slider").append("g")
        .attr("id","slider_text")
        .append("text")
            .attr("y", 35)
            .attr("x",5)
            .text("Less sensitive")
            .attr("font-size",10)

    d3.select("#slider").append("g")
    .attr("id","slider_text2")
    .append("text")
        .attr("y", 35)
        .attr("x",155)
        .text("More sensitive")
        .attr("font-size",10)

// Color mapping scales //  
var zScale = d3.scaleOrdinal().range(d3.schemeRdYlBu[bins]);      
var colorValue = d3.scaleQuantize().range(d3.schemeRdYlBu[bins]);  
var keys = zScale.range(); //// bins

// Create the bins for legends //
max = 1;
min = -1;
step = (max - min)/bins;     
bins_array = []
for (var i=0; i< bins; i++) {
    bins_array[i] = -1 + i*step;
}

// Scale domains for legend and stacks //
zScale.domain(bins_array); 
colorValue.domain([min,max]);
//console.log(zScale.domain())

// Data read and grouping //
// Read from json data file - main account //
var dataFrame = d3.json(filePath+fileName_acc, function(d) {
    return {
        text: d.text,
        sentiment: parseFloat(d.sentiment),   
        hashtags:  d.hashtags,  
        datetime : d.datetime  
        }
});  


// Add a counter and a bin to categorize the sentiment //
dataFrame.then( (data) => {

    // Add the color bin to each record  and format the date from T Z format //
    data.forEach(function(d) {
        d.count = 1;   
        d.bin = colorValue(d.sentiment); 
        d.datetime =  String(d.datetime).substring(0,10)
    }) 

    
    /// Order alphabetically //
    data.sort(function(x, y){
    return d3.descending(y.hashtags, x.hashtags);
    });

  
       
// Group data by hashtag and color bin, sum the counts //
    dataNest = d3.nest()
        .key(function(d) {return d.hashtags;})
        .key(function(d) {return d.bin;})
        
        .rollup(function(leaves) {
              return {
                "total": d3.sum(leaves, function(d) {return (d.count)})
              }
            }) 
        .entries(data)

// Group data by hashtag, get a count for x-axis //
    dataTotal = d3.nest()
        .key(function(d) {return d.hashtags;})
        .rollup(function(leaves) {
            return {
            "count":leaves.length
            }
        })  
        .entries(data);


// Make Excel-like format for stacked series - traspose counter and add all other color bins as columns //
    flatData = [];
    bincols = colorValue.range();

    dataNest.forEach(function(d) {   
        flat = [];
        flat["hashtag"] = d.key;
        d.values.forEach(function (e)  {

            bincols.forEach(function(bin) {  
                if (bin===e.key) { flat[bin] = e.value.total;}  //add the bin as a column that has the total
                      
                else {  if (!!flat[bin]) { } //exists, do nothing - might have a 0 or the previous counter

                        else {flat[bin]=0;}  //create column, with a 0 count.
                }
                
            }) //bincols
       
        }); //d.values

        flatData.push(flat);
    }) //forEach
   
// Update the total for the chart xAxis //
    flatData.forEach(function(d) {
        d.total = d3.sum(keys, k => +d[k])
    	return d
		})

    //Create top chart
    updateArea1(data, flatData, 500);  

/// Add the Color Legend for top chart //
	var legendRectSize = 12;
    var legendSpacing = 3; 

    var legend1 = area1.append("g")  ///Add to the right
        .append('svg')
        .attr("id","legendgroup")
        .attr("transform", "translate(1000,-300)")  
        .attr("width", margin.right*2)
        .attr("height", height)

        // legend area1 //
        .selectAll('.legend')
        .data(zScale.domain())
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', function(d, i) {
            var height = legendRectSize + legendSpacing;
            var horz = 0 ; 
            var vert = (i) * height; 
            return 'translate(' + horz + ',' + vert + ')';
        });


    legend1.append('rect')
    .attr('width', legendRectSize)
    .attr('height', legendRectSize)
    .style('fill', zScale)
    .style('stroke', zScale);

    legend1.append('text')
        .attr('x', legendRectSize + legendSpacing)
        .attr('y', legendRectSize - legendSpacing)
        .text(function(d,i) { 
            switch (i) {
                case 0: return Axis_Labels[i]; break;
                case 4: return Axis_Labels[i-3]; break;
                case 8: return Axis_Labels[i-6]; break;
                default: "" 
            };
        })
        .attr('font-size',10)
    
    ; 


// Add event to checkbox // 
    d3.select("#sort").on("click", function() {
            updateArea1(data, flatData,750);
        });
        
// Call slider //
    gStep.call(sliderStep);        

 });   ///end then



/*********************************/
/*********************************/
/// UPDATE FUNCTION - checkbox ////
/*********************************/
/*********************************/

function updateArea1(data, flatData, speed) {

    var hashtagsList = [...new Set(data.map(d => d.hashtags))]

    // Sort data by total desc when checked //
    flatData.sort(d3.select("#sort").property("checked")   
            ? (a, b) => a.total - b.total
            : (a, b) =>  hashtagsList.indexOf(b.hashtag) - hashtagsList.indexOf(a.hashtag)) 

    flatDataFil = flatData.filter(d3.select("#sort").property("checked")   
            ? function(d,i) { return i > flatData.length -1 - topN  }
            : function(d) { return d })

    // Scales for x and y //
    yScale_sb.range([height, 0]).padding(0.2);   
    xScale_sb.rangeRound([0, width - margin.left*3]);


    // Update scale domains //
    var mapY = flatDataFil.map(function(d) { return d.hashtag; })
    yScale_sb.domain(mapY);
    var maxX = d3.max(dataTotal, function(d) { return d["value"]["count"];});
    xScale_sb.domain([0, maxX ]); 
    var bandw = yScale_sb.bandwidth();

    // Create the stack //
    series = d3.stack().keys(keys)(flatDataFil), d => d.key;

    // Create groups for different colors //
    d3.selectAll(".g_layer").remove();
    var group = svg_stack.selectAll("g.layer")
        .data(series); 

    group.exit().remove();

    group.enter().append("g")
        .classed("layer", true)
        .attr("fill", d => d.key);   /// color bin - key on series

    // Add the bars to each group //
    var bars = svg_stack.selectAll("g.layer").selectAll("rect")
        .data(d => d); 

    bars.exit().remove();

    bars.enter().append("rect")
        .attr("height", bandw)    
        
        .on("mouseover", function(d) {
            //update bottom chart
            updateArea2(d.data.hashtag);
            //display tooltip
            tip1.transition()
                .duration(200)
                .style("opacity", .95)
                .style('display', 'inline');
                d3.select(this)
                .style("stroke", lineColor);
                        
            tip1.html( d.data.hashtag + "<hr>Subtotal: "+ (d[1]-d[0])  +  "<hr> Total: "   + d.data.total)				                     
                .style("left", (d3.event.pageX +15) + "px")
                .style("top", (d3.event.pageY - 40) + "px");
            })
          
        .on("mouseout", function(d) {
            tip1.transition()
                .duration(500)
                .style('display', 'none');
                d3.select(this)
                .style("stroke", "none");
        })

        .merge(bars)
        .transition().duration(speed)
        .attr("y", (d, i) => yScale_sb(d.data.hashtag)) /// hashtag tick                     
        .attr("x", d => xScale_sb(d[0]))
        .attr("width", d => xScale_sb(d[1]) - xScale_sb(d[0]))  /// horizontal bar width - each array has a [0] and [1] attributes that hold the stacked values


    // Add xAxis //
    d3.selectAll(".x-axis").remove()
    var xAxis = svg_stack.append("g")
        .attr("transform", "translate(0," + height + ")")
        .attr("class", "x-axis")  ///x-axis
        .call(g => g.append("text")
                .attr("font-family","Roboto") 
                .attr("x", (width - margin.left*2)/2)
                .attr("y", margin.bottom*2)
                .attr("fill", "currentColor")
                .attr("text-anchor", "middle")
                .attr("font-size","18px") 
                .text(X_Text_a1)) ;

    // Add yAxis //
    d3.selectAll(".y-axis").remove()
    var yAxis = svg_stack.append("g")
        .attr("class", "y-axis")
        .call(g => g.append("text")
                    .attr("font-weight","bold")
                    .attr("x", -100)
                    .attr("y", -margin.left)
                    .attr("text-anchor", "start")
                    .attr("dy", ".75em"))

    var tick_num = 2;
    if (flatDataFil.length <= topN) {tick_num = 1} else {tick_num = mod}

    // Update y axis //
    svg_stack.selectAll(".y-axis").transition().duration(speed)
        .call(d3.axisLeft(yScale_sb)
            .tickSizeOuter(0)            
            .tickValues(yScale_sb.domain().filter(function(d,i){ return !(i%tick_num)})))   ///change # of ticks

    // Update x axis //
    svg_stack.selectAll(".x-axis")  ///.transition().duration(speed)
        .call(d3.axisBottom(xScale_sb)
        .ticks(maxX/30))  ////(null, "s"))

    // Build 2nd chart (default) //
    updateArea2();

}; //end updateArea1 function;

 

/*********************************/
/*********************************/
//// TIME SERIES CHART ///
/*********************************/
/*********************************/


function updateArea2(selected_hash = title_hash[0]) {   

    // Graphics Device Setup //
    // Remove the previous chart //
    d3.selectAll('#svg_time')  
        .remove()

    // Create svg for chart //    
    var svg_time = area2.append("svg")   
                .attr("id","svg_time")
                .attr("width", width) 
                .attr("height", height + margin.top + margin.bottom)
                .attr("transform", "translate(" + -margin.left*2 + ", 0)")
                .append("g")
                .attr("transform", "translate(" + margin.left*2 + "," + margin.top/2 + ")")

    // Update title //
    var titlehash = d3.select("#titleHash")
    titlehash.html("#" + selected_hash + " " + Title_a2_ini)
    last_hash = selected_hash;
    

    // Pulling In Data //
    d3.json(filePath+fileName_pre + selected_hash + fileName_post).then(function(json) {    /// make it dynamic, tie to controls
        var jsonClean = json.map(function(d) {
            return {
                time : d.date, ///formatTime(parseTime(d.date)),  
                sentiment : +d.sentiment,
                cusumHigh : d.Cusum_high,
                cusumLow : d.Cusum_low,
            };
        });
        
        // Update time from T Z format //
        jsonClean.forEach(function(d) {
            d.time =  formatTime(parseTime( d.time.substring(0,10)))
        })     

        // X scale Controls //
        xDomain = [d3.min(jsonClean,function(d){return finalTime(d.time)}), 
            d3.max(jsonClean,function(d){return finalTime(d.time)})];   
            
        xScale_tl.domain(xDomain)
        .range([0, width - margin.left*3])
        .clamp(true);
        
        // Y scale Controls //
        yScale_tl.domain(yDomain)
        .range([height, 0])
        .clamp(true);          
            
        // Line Plot Generator //
        svg_time.selectAll("line")
        .data(jsonClean)
        .enter()
        .append("svg:line")
        .attr("x1", function(d,i) { return xScale_tl(finalTime(jsonClean[i].time)) })
        .attr("x2", function(d,i) { 
            if(i+1 < jsonClean.length) { return xScale_tl(finalTime(jsonClean[i+1].time)) } else { 
                return xScale_tl(finalTime(jsonClean[i].time))}
            })
        .attr("y1", function(d,i) { return yScale_tl(jsonClean[i].sentiment) })
        .attr("y2", function(d,i) { 
            if(i+1 < jsonClean.length) { return yScale_tl(jsonClean[i+1].sentiment) } else { 
                return yScale_tl(jsonClean[i].sentiment) }
            })
        .attr("fill","none")
        .attr("stroke-width",2.5)
        .attr("stroke", lineColor)
                
                
        svg_time.append('line')
                .attr('x1', xScale_tl(xDomain[0]))
                .attr('y1', yScale_tl(0))
                .attr('x2', xScale_tl(xDomain[1]))
                .attr('y2', yScale_tl(0))
                .attr('class', 'refline');
        
        // X Axis Control //
        svg_time.append("g")
        .attr("class", "axis_ticks")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale_tl));
        
        // Y Axis Controls //
        svg_time.append("g")
        .attr("class", "axis_ticks")
        .call(d3.axisLeft(yScale_tl)
        .tickValues([yDomain[0], 0, yDomain[1]])
        .tickFormat(function(d,i) { return Axis_Labels[i] }));

        // CUSUM vertical shaded bars
        let RECT_WIDTH = (width - margin.left*3)/jsonClean.length;
        let RECT_HEIGHT = height;
        svg_time.selectAll()
            .data(jsonClean)
            .enter()
            .append("rect")
            .attr("x", (d, i) => xScale_tl(finalTime(jsonClean[i].time)))
            .attr("y", 0)
            .attr("width", RECT_WIDTH)
            .attr("height", RECT_HEIGHT)
            .style("fill", (d) => determineCusumBarColor(d))
            .style("opacity", (d) => determineCusumBarOpacity(d))

        /*   //Y Axis Title   
        svg_time.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - axis_title_padding*1.5)
            .attr("x",0 - (height / 2))
            .attr("dy", "1em")
            .attr("class","axis_text")
            .attr("font-weight","bold")
            .attr("text-anchor","middle")
            .text(Y_Text_a2);  
        */

        /***********************************/
        /***********************************/
        /////////// SCATTER PLOT ///////////
        /***********************************/
        /***********************************/
        dataFrame.then( (data) => {
        
            /// Filter data by selected hashtag //
            data = data.filter(f => f.hashtags == selected_hash)	

            // Add the scatterplot //
            svg_time.selectAll("dot")
                .data(data)
                .enter().append("circle")
                .attr("r", 3)
                .attr("fill", function(d) {return colorValue(d.sentiment)})
                .attr("cx", function(d) { return xScale_tl(parseTime(d.datetime)); })   //d.dates 
                .attr("cy", function(d) { return yScale_tl(d.sentiment); })
                .on("mouseover", function(d) {
                    tip2.transition()
                        .duration(200)
                        .style("opacity", .9)
                        .style('display', 'inline');
                        d3.select(this)
                        .style("stroke", lineColor);
                        
                    
                    tip2.html(d.text)
                        .style("left", (d3.event.pageX +15) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                    })

                .on("mouseout", function(d) {
                    tip2.transition()
                        .duration(500)
                        .style('display', 'none')
                        .style("opacity", 0)
                        d3.select(this)
                        .style("stroke", "none");
                        
                });
        
        })  ///end dataFrame for Scatter Plot

    });

return svg_time; 
} /// end function updateArea2



/// Add the Color Legend for bottom chart //
var legend2 = area2.append("g")  ///Add to the right
        .append('svg')
        .attr("id","legendgroup2")
        .attr("transform", "translate(984,-70)")  
        .attr("width", margin.right*2)
        .attr("height", height)


    legend2.append("g")
        .attr("class", "legend")
        .attr("height", 0)
        .attr("width", 0)
        //.attr('transform', 'translate(0,250)');

    // Add the symbol //
    legend2.selectAll('.symbol')
        .data(legend2Data)
        .enter()
        .append('path')
        .attr('transform', function(d, i) {
        return 'translate(' + (8) + ',' + ((i * 20) + 12) + ')';
        })
        .attr('d', d3.symbol().type(function(d) {   
            if (d[2] === "circle") {
            return d3.symbolCircle  
            } else if (d[2] === "cross") {
            return d3.symbolCross  
            } else if (d[2] === "diamond") {
            return d3.symbolDiamond  
            } else if (d[2] === "square") {
            return d3.symbolSquare  
            } else {
            return d3.symbolTriangle 
            };
        })
        .size(90))
        .style("fill", function(d) {
        return d[1];
        })
        .style("stroke", function(d) {
            return d[1];
            })
        ;


    // Add the line symbol //
    legend2.append('line')
        .attr('x1', 4)
        .attr('y1', 72)
        .attr('x2', 12)
        .attr('y2', 72)
        .attr('stroke',lineColor)
        .attr("stroke-width",2.5);


    // Add the text //
    legend2.selectAll('.label')
        .data(legend2Data)
        .enter()
        .append('text')
        .attr("x", "16")
        .attr("y", function(d, i){ return ((i * 20)+15);})
        .text(function(d) { return d[0];})
        .attr('font-size',8);
        



// CUSUM functions //
function determineCusumBarColor(d) {
    if(d.cusumHigh >= CUSUM_THRESHOLD) {
        return "green";
    }
    else{
        return "red";
    }
};

function determineCusumBarOpacity(d) {
    if(d.cusumHigh >= CUSUM_THRESHOLD || d.cusumLow >= CUSUM_THRESHOLD) {
        return .1;
    }
    else{
        return 0;
    }
};