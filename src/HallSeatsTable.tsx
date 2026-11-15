import { useState, useEffect, useMemo } from 'react';

interface Place {
  Id: string;
  Row: string;
  Seat: string;
  Price: number;
}

interface Level {
  LevelId: string;
  LevelName: string;
  Places: Place[];
}

interface HallData {
  HallName: string;
  MaxSelectedSeats: number;
  Levels: Level[];
}

interface FlatPlace extends Place {
  LevelId: string;
  LevelName: string;
}

export default function HallSeatsTable() {
  const [hallData, setHallData] = useState<HallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedPrice, setSelectedPrice] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
          const parsedData: HallData = JSON.parse(jsonString);
          setHallData(parsedData);
        } else {
          throw new Error("JSON-ի փակվող փակագիծը չգտնվեց");
        }
      } catch (err: unknown) {
        console.error("Սխալ:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Անհայտ սխալ");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchHallData();
  }, []);

  const allPlaces = useMemo<FlatPlace[]>(() => {
    if (!hallData?.Levels) return [];
    let list: FlatPlace[] = [];
    hallData.Levels.forEach((level) => {
      level.Places?.forEach((place) => {
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
    return [...new Set(allPlaces.map((p) => p.LevelName))];
  }, [allPlaces]);

  const uniquePrices = useMemo(() => {
    return [...new Set(allPlaces.map((p) => p.Price))].sort((a, b) => a - b);
  }, [allPlaces]);

  const filteredPlaces = useMemo(() => {
    return allPlaces.filter((place) => {
      const matchSector = selectedSector === 'ALL' || place.LevelName === selectedSector;
      const matchPrice = selectedPrice === 'ALL' || place.Price.toString() === selectedPrice;
      const matchSearch = searchQuery === '' || 
        place.Row.toLowerCase().includes(searchQuery.toLowerCase()) || 
        place.Seat.toLowerCase().includes(searchQuery.toLowerCase());

      return matchSector && matchPrice && matchSearch;
    });
  }, [allPlaces, selectedSector, selectedPrice, searchQuery]);

  const groupedPlaces = useMemo(() => {
    const groups: { [sector: string]: FlatPlace[] } = {};
    filteredPlaces.forEach(place => {
      if (!groups[place.LevelName]) {
        groups[place.LevelName] = [];
      }
      groups[place.LevelName].push(place);
    });
    return groups;
  }, [filteredPlaces]);

  const clearFilters = () => {
    setSelectedSector('ALL');
    setSelectedPrice('ALL');
    setSearchQuery('');
  };

  if (loading) return <div style={styles.centerMessage}>Բեռնվում է տվյալները...</div>;
  if (error) return <div style={{ ...styles.centerMessage, color: '#ef4444' }}>Սխալ՝ {error}</div>;

  return (
    <div style={styles.container}>
      {/* Դինամիկ թեմաների կարգավորում (Light / Dark mode ավտոմատ անցում) */}
      <style>{`
        :root {
          --bg-main: #f9fafb;
          --bg-card: #ffffff;
          --bg-header: #f3f4f6;
          --text-main: #1f2937;
          --text-muted: #6b7280;
          --border-color: #e5e7eb;
          --scrollbar-track: #f1f5f9;
          --scrollbar-thumb: #cbd5e1;
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --bg-main: #111827;
            --bg-card: #1f2937;
            --bg-header: #374151;
            --text-main: #f9fafb;
            --text-muted: #9ca3af;
            --border-color: #374151;
            --scrollbar-track: #1f2937;
            --scrollbar-thumb: #4b5563;
          }
        }

        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: var(--scrollbar-track);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: 4px;
        }
      `}</style>

      {/* Վերնագիր
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{hallData?.HallName}</h1>
          <p style={styles.subtitle}>Առավելագույն ընտրվող տեղերի քանակը՝ {hallData?.MaxSelectedSeats}</p>
        </div>
      </div> */}

      {/* Ֆիլտրերի վահանակ */}
      <div style={styles.filtersPanel}>
        <div style={styles.filterItem}>
          <label style={styles.label}>Սեկտոր</label>
          <select 
            value={selectedSector} 
            onChange={(e) => setSelectedSector(e.target.value)}
            style={styles.control}
          >
            <option value="ALL">Բոլոր սեկտորները</option>
            {uniqueSectors.map((sector, index) => (
              <option key={index} value={sector}>{sector}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterItem}>
          <label style={styles.label}>Գին</label>
          <select 
            value={selectedPrice} 
            onChange={(e) => setSelectedPrice(e.target.value)}
            style={styles.control}
          >
            <option value="ALL">Բոլոր գները</option>
            {uniquePrices.map((price, index) => (
              <option key={index} value={price}>{price} ֏</option>
            ))}
          </select>
        </div>

        <div style={styles.filterItem}>
          <label style={styles.label}>Որոնել (Շարք / Տեղ)</label>
          <input 
            type="text" 
            placeholder="Օր. շարք 13, տեղ 19..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.control}
          />
        </div>

        <div style={{ ...styles.filterItem, display: 'flex', alignItems: 'flex-end', justifyContent: 'end' }}>
          <button 
            onClick={clearFilters}
            style={styles.button}
          >
            Մաքրել ֆիլտրերը
          </button>
        </div>
      </div>

      {/* Արդյունքների քանակ */}
      <div style={styles.resultsCount}>
        Մնացել է հասանելի <strong style={{ color: 'var(--text-main)' }}>{filteredPlaces.length}</strong> տեղ
      </div>

      {/* Խմբավորված աղյուսակներ ըստ սեկտորների */}
      <div style={styles.wrapperContainer}>
        {Object.keys(groupedPlaces).length > 0 ? (
          Object.entries(groupedPlaces).map(([sectorName, places]) => (
            <div key={sectorName} style={styles.sectorSection}>
              {/* Սեկտորի Վերնագիր */}
              <div style={styles.sectorHeader}>
                <span>{sectorName}</span>
                <span style={styles.sectorBadge}>{places.length} տեղ</span>
              </div>

              {/* Աղյուսակ տվյալ սեկտորի համար */}
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Շարք</th>
                      <th style={styles.th}>Տեղ</th>
                      <th style={styles.th}>Գին</th>
                      {/* <th style={{ ...styles.th, textAlign: 'right' }}>ID</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {places.map((place) => (
                      <tr key={place.Id} style={styles.tr}>
                        <td style={styles.td}>{place.Row}</td>
                        <td style={styles.td}>{place.Seat}</td>
                        <td style={{ ...styles.td, fontWeight: '600', color: '#16a34a' }}>{place.Price.toLocaleString()} ֏</td>
                        {/* <td style={{ ...styles.td, textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{place.Id}</td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div style={styles.noData}>
            Տվյալներ չեն գտնվել նշված ֆիլտրերով
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '16px',
    maxWidth: '1100px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: 'var(--bg-main)',
    color: 'var(--text-main)',
    minHeight: '100vh',
    boxSizing: 'border-box' as const
  },
  centerMessage: {
    padding: '48px 16px',
    textAlign: 'center' as const,
    color: 'var(--text-muted)',
    fontFamily: 'sans-serif',
    fontSize: '16px'
  },
  header: {
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-main)'
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: 'var(--text-muted)'
  },
  filtersPanel: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
    backgroundColor: 'var(--bg-card)',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    boxSizing: 'border-box' as const
  },
  filterItem: {
    display: 'flex',
    flexDirection: 'column' as const
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    color: 'var(--text-muted)',
    marginBottom: '6px'
  },
  control: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-main)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const
  },
  button: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: 'var(--bg-header)',
    color: 'var(--text-main)',
    fontSize: '14px',
    fontWeight: '600',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    cursor: 'pointer',
    boxSizing: 'border-box' as const
  },
  resultsCount: {
    marginBottom: '16px',
    fontSize: '13px',
    color: 'var(--text-muted)',
    paddingLeft: '4px'
  },
  wrapperContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px'
  },
  sectorSection: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
  },
  sectorHeader: {
    backgroundColor: 'var(--bg-header)',
    padding: '12px 16px',
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-main)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectorBadge: {
    backgroundColor: 'var(--border-color)',
    color: 'var(--text-main)',
    fontSize: '12px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  tableContainer: {
    overflowX: 'auto' as const,
    maxHeight: '400px',
    overflowY: 'auto' as const
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    textAlign: 'left' as const,
    fontSize: '14px',
    color: 'var(--text-main)',
  },
  th: {
    padding: '10px 16px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-header)',
    color: 'var(--text-main)',
    fontWeight: '600',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    width: '100%',

  },
  tr: {
    borderBottom: '1px solid var(--border-color)'
  },
  td: {
    padding: '10px 16px',
    color: 'var(--text-main)'
  },
  noData: {
    padding: '40px',
    textAlign: 'center' as const,
    color: 'var(--text-muted)',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)'
  }
} as const;