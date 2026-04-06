<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditLogController extends Controller
{
    public function index()
    {
        // Mengambil log terbaru, email, aktivitas, IP, dan Browser
        $logs = DB::table('activity_logs')
                    ->select('id', 'email', 'activity', 'ip_address', 'browser', 'created_at')
                    ->orderBy('created_at', 'desc')
                    ->limit(100)
                    ->get();

        return response()->json($logs);
    }
}