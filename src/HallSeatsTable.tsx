import React, { useState, useEffect, useMemo } from 'react';

export default function HallSeatsTable() {
  const [hallData, setHallData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ֆիլտրերի state-եր
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedPrice, setSelectedPrice] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchHallData() {
      try {
        const response = await fetch('/api/place/hallplanajax/1005223?clusterradius=61', {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/javascript, */*; q=0.01'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP սխալ! Ստատուս՝ ${response.status}`);
        }

        const text = await response.text();

        const seatsIndex = text.indexOf('.seats(');
        if (seatsIndex === -1) {
          throw new Error(".seats( ֆունկցիան չգտնվեց պատասխանում");
        }

        const startIndex = text.indexOf('{', seatsIndex);
        if (startIndex === -1) {
          throw new Error("JSON սկիզբը չգտնվեց");
        }

        let braceCount = 0;
        let endIndex = -1;
        let inString = false;
        let escape = false;

        for (let i = startIndex; i < text.length; i++) {
          let char = text[i];
          if (escape) { escape = false; continue; }
          if (char === '\\') { escape = true; continue; }
          if (char === '"') { inString = !inString; continue; }

          if (!inString) {
            if (char === '{') {
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                endIndex = i;
                break;
              }
            }
          }
        }

        if (endIndex !== -1) {
          const jsonString = text.substring(startIndex, endIndex + 1);
          const parsedData = JSON.parse(jsonString);
          setHallData(parsedData);
        } else {
          throw new Error("JSON-ի փակվող փակագիծը չգտնվեց");
        }
      } catch (err) {
        console.error("Սխալ:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchHallData();
  }, []);

  // Հարթ զանգված բոլոր տեղերի համար
  const allPlaces = useMemo(() => {
    if (!hallData?.Levels) return [];
    let list = [];
    hallData.Levels.forEach(level => {
      level.Places?.forEach(place => {
        list.push({
          ...place,
          LevelId: level.LevelId,
          LevelName: level.LevelName
        });
      });
    });
    return list;
  }, [hallData]);

  const uniqueSectors = useMemo(() => {
    return [...new Set(allPlaces.map(p => p.LevelName))];
  }, [allPlaces]);

  const uniquePrices = useMemo(() => {
    return [...new Set(allPlaces.map(p => p.Price))].sort((a, b) => a - b);
  }, [allPlaces]);

  // Ֆիլտրված տեղերը
  const filteredPlaces = useMemo(() => {
    return allPlaces.filter(place => {
      const matchSector = selectedSector === 'ALL' || place.LevelName === selectedSector;
      const matchPrice = selectedPrice === 'ALL' || place.Price.toString() === selectedPrice;
      const matchSearch = searchQuery === '' || 
        place.Row.toLowerCase().includes(searchQuery.toLowerCase()) || 
        place.Seat.toLowerCase().includes(searchQuery.toLowerCase());

      return matchSector && matchPrice && matchSearch;
    });
  }, [allPlaces, selectedSector, selectedPrice, searchQuery]);

  const clearFilters = () => {
    setSelectedSector('ALL');
    setSelectedPrice('ALL');
    setSearchQuery('');
  };

  if (loading) return <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280', fontFamily: 'sans-serif' }}>Բեռնվում է տվյալները...</div>;
  if (error) return <div style={{ padding: '32px', textAlign: 'center', color: '#ef4444', fontFamily: 'sans-serif' }}>Սխալ՝ {error}</div>;

  return (
    <div style={styles.container}>
      {/* Վերնագիր */}
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#1f2937' }}>{hallData?.HallName}</h1>
        </div>
      </div>

      {/* Ֆիլտրերի վահանակ */}
      <div style={styles.filtersPanel}>
        <div>
          <label style={styles.label}>Սեկտոր</label>
          <select 
            value={selectedSector} 
            onChange={(e) => setSelectedSector(e.target.value)}
            style={styles.select}
          >
            <option value="ALL">Բոլոր սեկտորները</option>
            {uniqueSectors.map((sector, index) => (
              <option key={index} value={sector}>{sector}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={styles.label}>Գին</label>
          <select 
            value={selectedPrice} 
            onChange={(e) => setSelectedPrice(e.target.value)}
            style={styles.select}
          >
            <option value="ALL">Բոլոր գները</option>
            {uniquePrices.map((price, index) => (
              <option key={index} value={price}>{price} ֏</option>
            ))}
          </select>
        </div>

        <div>
          <label style={styles.label}>Որոնել (Շարք / Տեղ)</label>
          <input 
            type="text" 
            placeholder="Օր. շարք 13, տեղ 19..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button 
            onClick={clearFilters}
            style={styles.button}
          >
            Մաքրել ֆիլտրերը
          </button>
        </div>
      </div>

      {/* Արդյունքների քանակ */}
      <div style={{ marginBottom: '12px', fontSize: '13px', color: '#4b5563' }}>
        Գտնվեց հասանելի տեղ՝ <strong style={{ color: '#111827' }}>{filteredPlaces.length}</strong>
      </div>

      {/* Աղյուսակ */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Սեկտոր</th>
              <th style={styles.th}>Շարք</th>
              <th style={styles.th}>Տեղ</th>
              <th style={styles.th}>Գին</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>ID</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlaces.length > 0 ? (
              filteredPlaces.map((place) => (
                <tr key={place.Id} style={{ backgroundColor: '#ffffff' }}>
                  <td style={{ ...styles.td, fontWeight: '500', color: '#111827' }}>{place.LevelName}</td>
                  <td style={styles.td}>{place.Row}</td>
                  <td style={styles.td}>{place.Seat}</td>
                  <td style={{ ...styles.td, fontWeight: '600', color: '#16a34a' }}>{place.Price.toLocaleString()} ֏</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>{place.Id}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                  Տվյալներ չեն գտնվել նշված ֆիլտրերով
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Inline Styles Օբյեկտ
const styles = {
  container: {
    padding: '24px',
    margin: '0 auto',
    width: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f9fafb',
    minHeight: '100vh',
    borderRadius: '16px',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px'
  },
  filtersPanel: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: '6px'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '10px 16px',
    color: '#374151',
    fontSize: '14px',
    fontWeight: '600',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  tableContainer: {
    overflowX: 'auto',
    maxHeight: '550px',
    overflowY: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
    color: '#4b5563'
  },
  th: {
    padding: '14px 16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontWeight: '600',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  td: {
    padding: '14px 16px',
    borderBottom: '1px solid #f3f4f6'
  }
};