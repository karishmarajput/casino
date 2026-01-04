import React, { useState, useEffect } from 'react';
import { baseAxios } from '../utils/axiosConfig';
import './FamilyRanking.css';

function FamilyRanking() {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFamilyRanking();
    const interval = setInterval(fetchFamilyRanking, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchFamilyRanking = async () => {
    try {
      const response = await baseAxios.get('/api/families/ranking');
      setFamilies(response.data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const maxTotal = families.length > 0 ? Math.max(...families.map(f => f.family_total)) : 1;

  return (
    <div className="family-ranking-container">
      <div className="bar-chart-container">
        {families.map((family, index) => {
          const percentage = maxTotal > 0 ? (family.family_total / maxTotal) * 100 : 0;
          
          return (
            <div key={family.captain_id} className="bar-item">
              <div className="bar-row">
                <span className="family-name" title={`${family.captain_name}'s Family`}>{family.captain_name}'s Family</span>
                <div className="bar-wrapper">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${percentage}%`,
                    }}
                  >
                  </div>
                </div>
                <span className="bar-value">${parseFloat(family.family_total).toFixed(2)}</span>
              </div>
            </div>
          );
        })}
        {families.length === 0 && (
          <div className="no-families">No families registered yet. Register captains first!</div>
        )}
      </div>
    </div>
  );
}

export default FamilyRanking;

