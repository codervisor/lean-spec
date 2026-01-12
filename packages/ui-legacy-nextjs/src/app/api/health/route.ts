import { NextResponse } from 'next/server';
import pkg from '../../../../package.json';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: process.env.npm_package_version || pkg.version,
  });
}
