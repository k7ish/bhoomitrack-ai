import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { buildFirestoreSeedPayloads } from './scripts/seed-firestore.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Backend architecture & health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'BhoomiTrack AI Backend (SIH26016)',
      environment: process.env.NODE_ENV || 'development',
      capabilities: [
        'Express REST API',
        'Firebase Firestore Client Sync',
        'Decision Support Engine (GIS & Infrastructure Synced)',
      ],
      timestamp: new Date().toISOString(),
    });
  });

  // Serve validated synthetic dataset payloads read directly from /data/*.csv & /data/parcels.geojson
  app.get('/api/dataset/synthetic', (req: Request, res: Response) => {
    try {
      const ownerId =
        typeof req.query.ownerId === 'string' && req.query.ownerId.trim()
          ? req.query.ownerId.trim()
          : 'DEMO_OFFICER_UID';
      const payloads = buildFirestoreSeedPayloads(ownerId);
      res.json({
        status: 'ok',
        counts: {
          projects: payloads.projectsDocs.length,
          parcels: payloads.parcelsDocs.length,
          landowners: payloads.landownersDocs.length,
          compensations: payloads.compensationsDocs.length,
          documents: payloads.documentsDocs.length,
          rehabilitation_resettlement: payloads.rehabilitationsDocs.length,
          parcel_geometries: payloads.geometriesDocs.length,
        },
        payloads,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load synthetic dataset from /data.';
      res.status(500).json({ error: message });
    }
  });

  // Server-side Decision Support Engine Endpoint (GIS Cadastral & Project Synced)
  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    try {
      const {
        projects = [],
        parcels = [],
        gisParcels = [],
        gisSummary = {},
        query = '',
      } = req.body || {};

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured on the server. Please verify your API key in Settings > Secrets.',
        });
        return;
      }

      const ai = getGeminiClient();

      const contextSummary = JSON.stringify(
        {
          infrastructureProjects: Array.isArray(projects)
            ? projects.map((p: any) => ({
                id: p.id,
                title: p.title,
                code: p.code,
                agency: p.agency,
                stage: p.stage,
                status: p.status,
                proposedAreaHa: p.totalAreaHectares,
                acquiredAreaHa: p.acquiredAreaHectares,
                budgetCr: p.budgetInrCrores,
                disbursedCr: p.disbursedInrCrores,
              }))
            : [],
          gisCadastralSummary: {
            cadastralBelt: 'Tangori–Chunni Kalan Greenfield Paddy Belt (SAS Nagar / Fatehgarh Sahib)',
            hadbastNumber: 'Hadbast 39175 / 142',
            totalMeshParcels: gisSummary?.totalParcels || 60,
            acquiredPlots: gisSummary?.acquiredCount || 0,
            approvedConsentPlots: gisSummary?.approvedCount || 0,
            disputedBottleneckPlots: gisSummary?.disputedCount || 0,
            notificationStagePlots: gisSummary?.notificationCount || 0,
            disputedKhasras: gisSummary?.disputedKhasras || [
              'Khasra 4/1 (PAR-PB-004, Sukhdev Singh Bajwa - Abadi Deh Edge)',
              'Khasra 2/1 (PAR-PB-002, Harjinder Kaur Gill - Chahi / Urban Multiplier)',
              'Khasra 7/1 (PAR-PB-007, Gurmeet Singh - Canal Watercourse Co-sharer)',
              'Khasra 8/1 (PAR-PB-008, Balwinder Singh Sandhu - Tree Solatium)',
            ],
            linearFeatures: 'Rajbaha Irrigation Canal & Tangori–Chunni Kalan Village Link Road',
          },
          liveParcelsSample: Array.isArray(parcels)
            ? parcels.slice(0, 30).map((p: any) => ({
                id: p.id,
                khasra: p.surveyNumber,
                landowner: p.landownerName,
                projectId: p.projectId,
                village: p.village,
                stage: p.acquisitionStage,
                areaHa: p.areaHectares,
                awardInr: p.compensationAmountInr,
                compensationStatus: p.compensationStatus,
              }))
            : [],
          activeGisHighlights: Array.isArray(gisParcels)
            ? gisParcels.slice(0, 20).map((gp: any) => ({
                parcelId: gp.parcel_id || gp.id,
                khasraNo: gp.khasra_number || gp.surveyNumber,
                owner: gp.landowner_name || gp.landownerName,
                status: gp.acquisition_status || gp.status,
                areaHa: gp.area_hectares || gp.areaHectares,
                awardCr: gp.compensation_inr ? (gp.compensation_inr / 10000000).toFixed(2) : undefined,
              }))
            : [],
          officerQuery:
            query ||
            'Provide an executive statutory risk, corridor continuity, and bottleneck assessment across live GIS map and projects.',
        },
        null,
        2
      );

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analyze the following real-time Land Acquisition & GIS Cadastral dataset from BhoomiTrack AI (under the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 - RFCTLARR 2013):\n\n${contextSummary}`,
        config: {
          systemInstruction:
            'You are the Decision Support Engine for BhoomiTrack AI (SIH26016), an executive Land Acquisition and Statutory Management System in India. Provide concise, high-trust, actionable administrative insights grounded strictly in the provided project records, GIS cadastral map features, and compensation data. Synthesize linear continuity across infrastructure corridors (like NH-205A, Tricity Metro, PR-7 Aerotropolis) and cadastral mesh bottlenecks (such as disputed plots along Row 2 in Tangori/Chunni Kalan, Section 15 collector hearings, and Section 77(2) court escrow). Never invent non-existent statistics; cite exact project codes, Khasra numbers, and statutory sections under RFCTLARR Act 2013.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: {
                type: Type.STRING,
                description:
                  'Concise 2-3 sentence executive briefing summarizing live GIS corridor progress, linear continuity, and high-impact statutory bottlenecks.',
              },
              riskAlerts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    severity: {
                      type: Type.STRING,
                      description: 'Critical, High, or Medium',
                    },
                    detail: { type: Type.STRING },
                  },
                },
                description:
                  'Specific statutory, GIS cadastral, litigation, or disbursement risk alerts.',
              },
              recommendedActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Concrete administrative next steps under RFCTLARR Act 2013 citing statutory sections (Sec 15, Sec 19, Sec 38, Sec 77(2)).',
              },
            },
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to run AI decision support analysis.';
      console.error('Decision Support Engine API error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BhoomiTrack AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
