#include<bits/stdc++.h>
using namespace std;
void dijkstra (int start,vector<vector<pair<int,int>>>&graph,vector<int>&dist){
    int n = graph.size();
    dist.assign(n, INT_MAX);
    dist[start] = 0;
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    pq.push({0, start});

    while(!pq.empty()){
        int d = pq.top().first;
        int u = pq.top().second;
        pq.pop();

        if(d>dist[u])
            continue;
       for(auto &edge:graph[u]){
           int v = edge.first;
           int w = edge.second;
           if(dist[v]>dist[u]+w){
               dist[v] = dist[u] + w;
               pq.push({dist[v], v});
           }
       }
    }
}

int main(){
    int n = 5;
    vector<vector<pair<int,int>>> graph(n);
    graph[0].push_back({1, 2});
    graph[1].push_back({0, 2});
    graph[1].push_back({2, 4});
    graph[2].push_back({1, 4});
    graph[0].push_back({3, 1});
    graph[3].push_back({0, 1});
    graph[3].push_back({4,3});
    graph[4].push_back({2, 1});
    graph[2].push_back({4, 1});

    vector<int> dist;
    int start = 0;
    dijkstra(start, graph, dist);

    for (int i = 0; i < n;i++){
        cout << i << " " << dist[i] << endl;
    }
}