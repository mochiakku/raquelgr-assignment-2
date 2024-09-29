import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './styles.css';

const KMeansClustering = () => {
    const width = 600, height = 600;
    const margin = 50; // Set a margin to keep centroids away from the walls
    const numPoints = 100;
    const [dataPoints, setDataPoints] = useState([]);
    const [centroids, setCentroids] = useState([]);
    const [k, setK] = useState(3);
    const [initMethod, setInitMethod] = useState('random');
    const [isAnimating, setIsAnimating] = useState(false);
    const svgRef = useRef();
  
    const xScale = d3.scaleLinear().domain([0, 1]).range([margin, width - margin]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([margin, height - margin]);
  
    const generateData = () => {
      const points = d3.range(numPoints).map(() => ({
        x: Math.random(),
        y: Math.random(),
        cluster: null
      }));
      setDataPoints(points);
    };
  
    const plotData = () => {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
  
      svg.selectAll(".data-point")
        .data(dataPoints)
        .enter().append("circle")
        .attr("class", "data-point")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 5)
        .attr("fill", d => d.cluster !== null ? d3.schemeCategory10[d.cluster] : 'steelblue')
        .attr("stroke", "black");
  
      svg.selectAll(".centroid")
        .data(centroids)
        .enter().append("circle")
        .attr("class", "centroid")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 8)
        .attr("fill", "red")
        .attr("stroke", "black")
        .attr("stroke-width", 2);
    };
  
    const animatePlot = (updatedPoints, updatedCentroids) => {
      const svg = d3.select(svgRef.current);
  
      svg.selectAll(".data-point")
        .data(updatedPoints)
        .transition().duration(1000)
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("fill", d => d.cluster !== null ? d3.schemeCategory10[d.cluster] : 'steelblue');
  
      svg.selectAll(".centroid")
        .data(updatedCentroids)
        .transition().duration(1000)
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y));
    };
  
    const limitCentroidPosition = centroid => ({
      x: Math.min(Math.max(centroid.x, margin / width), 1 - margin / width),
      y: Math.min(Math.max(centroid.y, margin / height), 1 - margin / height)
    });
  
    const initializeCentroids = () => {
      let newCentroids = [];
      if (initMethod === 'random') {
        newCentroids = d3.shuffle(dataPoints).slice(0, k).map(limitCentroidPosition);
      }else if (initMethod === 'farthest') {
        newCentroids.push(d3.shuffle(dataPoints)[0]); // Select a random first centroid
        while (newCentroids.length < k) {
          const distances = dataPoints.map(point => Math.min(...newCentroids.map(c => distance(point, c))));
          const farthestPointIndex = d3.maxIndex(distances);
          newCentroids.push(dataPoints[farthestPointIndex]);
        }
      } else if (initMethod === 'kmeans++') {
        newCentroids.push(d3.shuffle(dataPoints)[0]); 
        while (newCentroids.length < k) {
          const distances = dataPoints.map(point => Math.min(...newCentroids.map(c => distance(point, c))));
          const weightedProbabilities = distances.map(d => d * d); 
          const totalWeight = d3.sum(weightedProbabilities);
          const rand = Math.random() * totalWeight;
          let cumulativeWeight = 0;
          for (let i = 0; i < weightedProbabilities.length; i++) {
            cumulativeWeight += weightedProbabilities[i];
            if (cumulativeWeight >= rand) {
              newCentroids.push(dataPoints[i]);
              break;
            }
          }}}
      return newCentroids;
    };
  
    const distance = (p1, p2) => {
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    };
  
    const kmeansStep = (currentPoints, currentCentroids) => {
      const updatedPoints = currentPoints.map(point => {
        const nearestCentroidIndex = d3.scan(currentCentroids, (c1, c2) => distance(point, c1) - distance(point, c2));
        return { ...point, cluster: nearestCentroidIndex };
      });
  
      const updatedCentroids = d3.range(k).map(i => {
        const clusterPoints = updatedPoints.filter(d => d.cluster === i);
        let newCentroid = {
          x: d3.mean(clusterPoints, d => d.x) || currentCentroids[i].x,
          y: d3.mean(clusterPoints, d => d.y) || currentCentroids[i].y
        };
        return limitCentroidPosition(newCentroid); // Limit centroids to stay within the bounds
      });
  
      return { updatedPoints, updatedCentroids };
    };
  
    const runKMeans = () => {
        setIsAnimating(true);
      
        let currentPoints = [...dataPoints];
        let currentCentroids = initMethod === 'manual' && centroids.length > 0 
          ? centroids 
          : initializeCentroids(); // Use existing centroids if in manual mode
      
        setCentroids(currentCentroids); // Set the initialized centroids for visualization
      
        const interval = setInterval(() => {
          const { updatedPoints, updatedCentroids } = kmeansStep(currentPoints, currentCentroids);
          
          animatePlot(updatedPoints, updatedCentroids);
      
          // Check if centroids have moved
          const hasConverged = currentCentroids.every((centroid, i) => 
            Math.abs(centroid.x - updatedCentroids[i].x) < 1e-3 &&
            Math.abs(centroid.y - updatedCentroids[i].y) < 1e-3
          );
      
          if (hasConverged) {
            clearInterval(interval); // Stop animation
            setIsAnimating(false);
            alert("KMeans clustering has finished running!");
          }
      
          // Update points and centroids for the next step
          currentPoints = updatedPoints;
          currentCentroids = updatedCentroids;
        }, 1000); 
      };
      
    const runKMeansFinal = () => {
        let currentPoints = [...dataPoints];
        let currentCentroids = initMethod === 'manual' && centroids.length > 0 
          ? centroids 
          : initializeCentroids(); // Use existing centroids if in manual mode
    
        let hasConverged = false;
        while (!hasConverged) {
          const { updatedPoints, updatedCentroids } = kmeansStep(currentPoints, currentCentroids);
    
          hasConverged = currentCentroids.every((centroid, i) => 
            Math.abs(centroid.x - updatedCentroids[i].x) < 1e-3 &&
            Math.abs(centroid.y - updatedCentroids[i].y) < 1e-3
          );
    
          currentPoints = updatedPoints;
          currentCentroids = updatedCentroids;
        }
    
        setDataPoints(currentPoints);
        setCentroids(currentCentroids);
      };
      const resetPlot = () => {
        setCentroids([]); 
        generateData(); 
      };

      const deleteCentroid = () => {
        const resetPoints = dataPoints.map(point => ({ ...point, cluster: null })); // Reset cluster to null
    setCentroids([]); // Clear only the centroids
    setDataPoints(resetPoints); 
        
      }

      const handleClick = (event) => {
        if (initMethod === 'manual' && centroids.length < k) {
          const [x, y] = d3.pointer(event);
          const newCentroid = {
            x: xScale.invert(x),
            y: yScale.invert(y),
          };
          setCentroids(prev => [...prev, limitCentroidPosition(newCentroid)]);
        }
      };
  
    useEffect(() => {
      generateData();
    }, []);
  
    useEffect(() => {
      plotData();
    }, [dataPoints, centroids]);
  
    return (
      <div className = "container">
        <div>
          <label htmlFor="clusters">Number of Clusters:</label>
          <input
            type="number"
            id="clusters"
            value={k}
            min="1"
            max="10"
            onChange={(e) => setK(Number(e.target.value))}
            disabled={isAnimating}
          />
          <label htmlFor="init-method">Initialization Method:</label>
          <select
            id="init-method"
            value={initMethod}
            onChange={(e) => setInitMethod(e.target.value)}
            disabled={isAnimating}
          >
            <option value="random">Random</option>
            <option value="farthest">Farthest First</option>
            <option value="kmeans++">KMeans++</option>
            <option value="manual">Manual</option>
          </select>
          <button onClick={() => runKMeans()} disabled={isAnimating}>Run KMeans</button>
          <button onClick={() => runKMeansFinal()} disabled={isAnimating}>Run to Convergence</button>
          <button onClick={() => resetPlot()} disabled={isAnimating}>Create new data set</button>
          <button onClick={() => deleteCentroid()} disabled={isAnimating}>Reset</button>
        </div>
        <svg ref={svgRef} width={width} height={height} onClick={handleClick} />
      </div>
      
    );
  };
  
  export default KMeansClustering;
  