// All 30 construction milestones for a civil building project

export const CONSTRUCTION_METRICS = [
  // Phase 1 - Pre Construction
  { key: 'site_survey',           phase: 1, phaseName: 'Pre-Construction', label: 'Site Survey'           },
  { key: 'land_survey_approval',  phase: 1, phaseName: 'Pre-Construction', label: 'Land Survey Approval'  },
  { key: 'soil_testing',          phase: 1, phaseName: 'Pre-Construction', label: 'Soil Testing'           },
  { key: 'site_clearing',         phase: 1, phaseName: 'Pre-Construction', label: 'Site Clearing'          },
  { key: 'site_layout_marking',   phase: 1, phaseName: 'Pre-Construction', label: 'Site Layout Marking'   },

  // Phase 2 - Foundation
  { key: 'excavation',            phase: 2, phaseName: 'Foundation',       label: 'Excavation'            },
  { key: 'pcc',                   phase: 2, phaseName: 'Foundation',       label: 'PCC (Plain Cement Concrete)' },
  { key: 'reinforcement',         phase: 2, phaseName: 'Foundation',       label: 'Reinforcement'         },
  { key: 'footing',               phase: 2, phaseName: 'Foundation',       label: 'Footing'               },
  { key: 'foundation_concrete',   phase: 2, phaseName: 'Foundation',       label: 'Foundation Concrete'   },

  // Phase 3 - Structural Work
  { key: 'column_construction',   phase: 3, phaseName: 'Structural Work',  label: 'Column Construction'   },
  { key: 'beam_construction',     phase: 3, phaseName: 'Structural Work',  label: 'Beam Construction'     },
  { key: 'slab_casting',          phase: 3, phaseName: 'Structural Work',  label: 'Slab Casting'          },
  { key: 'staircase_construction',phase: 3, phaseName: 'Structural Work',  label: 'Staircase Construction'},
  { key: 'roof_structure',        phase: 3, phaseName: 'Structural Work',  label: 'Roof Structure'        },

  // Phase 4 - Masonry
  { key: 'brickwork',             phase: 4, phaseName: 'Masonry',          label: 'Brickwork'             },
  { key: 'internal_walls',        phase: 4, phaseName: 'Masonry',          label: 'Internal Walls'        },
  { key: 'external_walls',        phase: 4, phaseName: 'Masonry',          label: 'External Walls'        },
  { key: 'plastering',            phase: 4, phaseName: 'Masonry',          label: 'Plastering'            },

  // Phase 5 - Finishing
  { key: 'electrical_wiring',     phase: 5, phaseName: 'Finishing',        label: 'Electrical Wiring'     },
  { key: 'plumbing',              phase: 5, phaseName: 'Finishing',        label: 'Plumbing'              },
  { key: 'flooring',              phase: 5, phaseName: 'Finishing',        label: 'Flooring'              },
  { key: 'painting',              phase: 5, phaseName: 'Finishing',        label: 'Painting'              },
  { key: 'doors_installation',    phase: 5, phaseName: 'Finishing',        label: 'Doors Installation'    },
  { key: 'windows_installation',  phase: 5, phaseName: 'Finishing',        label: 'Windows Installation'  },
  { key: 'false_ceiling',         phase: 5, phaseName: 'Finishing',        label: 'False Ceiling'         },

  // Phase 6 - Final Inspection
  { key: 'quality_inspection',    phase: 6, phaseName: 'Final Inspection', label: 'Quality Inspection'    },
  { key: 'safety_inspection',     phase: 6, phaseName: 'Final Inspection', label: 'Safety Inspection'     },
  { key: 'final_cleaning',        phase: 6, phaseName: 'Final Inspection', label: 'Final Cleaning'        },
  { key: 'project_handover',      phase: 6, phaseName: 'Final Inspection', label: 'Project Handover'      },
];

export const TOTAL_METRICS = CONSTRUCTION_METRICS.length; // 30

export function getMetricsByPhase() {
  const grouped = {};
  CONSTRUCTION_METRICS.forEach(m => {
    if (!grouped[m.phase]) {
      grouped[m.phase] = { phaseName: m.phaseName, metrics: [] };
    }
    grouped[m.phase].metrics.push(m);
  });
  return grouped;
}
