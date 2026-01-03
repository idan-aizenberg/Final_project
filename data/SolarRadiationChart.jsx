import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Initialize Supabase (Ensure you have these environment variables or replace them here)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SolarRadiationChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(0);
  const [availableIds, setAvailableIds] = useState([]);

  useEffect(() => {
    // Fetch all available simulation IDs to populate the dropdown
    const fetchIds = async () => {
      const { data } = await supabase
        .from('solar_radiation_simulations')
        .select('id')
        .order('id', { ascending: true });
      if (data) setAvailableIds(data.map(row => row.id));
    };
    fetchIds();
  }, []);

  useEffect(() => {
    const fetchSolarData = async (id) => {
      setLoading(true);
      try {
        const { data: result, error } = await supabase
          .from('solar_radiation_simulations')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (result && result.data_values) {
          // Slice data to improve performance if array is huge (e.g., first 500 points)
          const formattedData = result.data_values.slice(0, 500).map((val, idx) => ({
            timeStep: idx,
            radiation: val
          }));
          setData(formattedData);
        }
      } catch (err) {
        console.error('Error fetching solar data:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSolarData(selectedId);
  }, [selectedId]);

  if (loading && data.length === 0) return <div className="p-4">Loading Solar Data...</div>;

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-xl font-bold mb-4 text-orange-600">Solar Radiation Simulation</h2>
      
      <div className="mb-4">
        <label className="mr-2 font-medium">Select Simulation ID:</label>
        <select 
          value={selectedId} 
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="border border-gray-300 rounded p-1"
        >
          {availableIds.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timeStep" />
            <YAxis label={{ value: 'Radiation', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="radiation" 
              stroke="#ff7300" 
              dot={false} 
              strokeWidth={2} 
              name="Solar Radiation"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SolarRadiationChart;
